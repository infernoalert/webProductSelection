import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, setDoc, updateDoc, serverTimestamp, getDocs, deleteDoc, getDoc, query, orderBy } from '@angular/fire/firestore';
import { Storage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { Question, AnswerGroup, Answer } from '../models/question.model';
import { catchError, from, map, Observable, switchMap, throwError, forkJoin, of } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class QuestionService {
  private firestore: Firestore = inject(Firestore);
  private storage: Storage = inject(Storage);

  /**
   * Gets a list of all questions from Firestore
   * @returns An Observable with an array of Question objects
   */
  getQuestions(): Observable<Question[]> {
    const questionsRef = collection(this.firestore, 'questions');
    const questionsQuery = query(questionsRef, orderBy('createdAt', 'desc'));
    
    return from(getDocs(questionsQuery)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            ...data,
            id: doc.id
          } as Question;
        });
      }),
      catchError(error => {
        console.error('Error getting questions:', error);
        return throwError(() => new Error(`Failed to get questions: ${error.message}`));
      })
    );
  }

  /**
   * Gets a single question by ID
   * @param id The question ID
   * @returns An Observable with the Question object
   */
  getQuestion(id: string): Observable<Question> {
    const questionRef = doc(this.firestore, 'questions', id);
    
    return from(getDoc(questionRef)).pipe(
      map(docSnap => {
        if (!docSnap.exists()) {
          throw new Error(`Question with ID ${id} not found`);
        }
        
        const data = docSnap.data() as any;
        return {
          ...data,
          id: docSnap.id
        } as Question;
      }),
      catchError(error => {
        console.error(`Error getting question ${id}:`, error);
        return throwError(() => new Error(`Failed to get question: ${error.message}`));
      })
    );
  }

  /**
   * Deletes a question and its associated images from Firestore and Storage
   * @param id The question ID to delete
   * @returns An Observable that completes when the deletion is successful
   */
  deleteQuestion(id: string): Observable<void> {
    const questionRef = doc(this.firestore, 'questions', id);
    
    // First get the question to know which images to delete
    return this.getQuestion(id).pipe(
      switchMap(question => {
        const deletePromises: Promise<void>[] = [];
        
        // Delete question image if it exists
        if (question.imageUrl) {
          const imagePath = `questions/${id}/main`;
          deletePromises.push(this.deleteImage(imagePath));
        }
        
        // Delete answer group images
        if (question.answerGroups) {
          question.answerGroups.forEach(group => {
            group.answers.forEach(answer => {
              if (answer.imageUrl) {
                const imagePath = `questions/${id}/groups/${group.id}/answers/${answer.id}`;
                deletePromises.push(this.deleteImage(imagePath));
              }
            });
          });
        }
        
        // Delete the document from Firestore
        deletePromises.push(deleteDoc(questionRef).catch(error => {
          console.error(`Error deleting question ${id}:`, error);
          throw new Error(`Failed to delete question: ${error.message}`);
        }));
        
        return from(Promise.all(deletePromises)).pipe(
          map(() => void 0)
        );
      }),
      catchError(error => {
        console.error(`Error in deleteQuestion for ID ${id}:`, error);
        return throwError(() => new Error(`Failed to delete question: ${error.message}`));
      })
    );
  }

  /**
   * Helper method to delete an image from Firebase Storage
   */
  private deleteImage(path: string): Promise<void> {
    const storageRef = ref(this.storage, path);
    return deleteObject(storageRef).catch(error => {
      // Log but don't fail if image deletion fails
      console.warn(`Warning: Failed to delete image at ${path}:`, error);
      return Promise.resolve();
    });
  }

  /**
   * Saves a question with nested answer groups to Firestore
   * Handles validation and uploads any attached images to Firebase Storage
   * 
   * @param question The question object to save
   * @returns An Observable with the saved question ID
   */
  saveQuestion(question: Question): Observable<string> {
    // Validate the question
    const validationResult = this.validateQuestion(question);
    
    if (!validationResult.isValid) {
      return throwError(() => new Error(validationResult.error));
    }

    // Assign an ID if it's a new question
    if (!question.id) {
      question.id = uuidv4();
    }

    // Handle image uploads (main question image and answer images)
    return this.uploadImages(question).pipe(
      switchMap(updatedQuestion => {
        // Prepare the data for Firestore (remove File objects)
        const questionData = this.prepareQuestionData(updatedQuestion);
        
        // Save to Firestore
        const questionsRef = collection(this.firestore, 'questions');
        const questionRef = doc(questionsRef, question.id);
        
        return from(setDoc(questionRef, questionData)).pipe(
          map(() => question.id as string),
          catchError(error => {
            console.error('Error saving question to Firestore:', error);
            return throwError(() => new Error(`Failed to save question: ${error.message}`));
          })
        );
      }),
      catchError(error => {
        console.error('Error in saveQuestion:', error);
        return throwError(() => new Error(`Failed to process question: ${error.message}`));
      })
    );
  }

  /**
   * Validates that a question meets all requirements
   */
  private validateQuestion(question: Question): { isValid: boolean, error?: string } {
    // Check if question text exists
    if (!question.text || question.text.trim() === '') {
      return { isValid: false, error: 'Question text is required' };
    }

    // Check if there's at least one answer group
    if (!question.answerGroups || question.answerGroups.length === 0) {
      return { isValid: false, error: 'At least one answer group is required' };
    }

    // Check each answer group
    for (const answerGroup of question.answerGroups) {
      // Check if the answer group has at least one answer
      if (!answerGroup.answers || answerGroup.answers.length === 0) {
        return { isValid: false, error: 'Each answer group must have at least one answer' };
      }

      // Check each answer
      for (const answer of answerGroup.answers) {
        if (!answer.text || answer.text.trim() === '') {
          return { isValid: false, error: 'All answers must have text' };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Uploads images for question and answers to Firebase Storage
   */
  private uploadImages(question: Question): Observable<Question> {
    const uploads: Observable<any>[] = [];
    const updatedQuestion: Question = { ...question };

    // Handle question image upload if there's a file
    if (question.imageFile) {
      const upload$ = this.uploadImageFile(question.imageFile, `questions/${question.id}/main`).pipe(
        map(downloadUrl => {
          updatedQuestion.imageUrl = downloadUrl;
          delete updatedQuestion.imageFile;
          return true;
        })
      );
      uploads.push(upload$);
    }

    // Handle answer images
    updatedQuestion.answerGroups = [...question.answerGroups];
    
    updatedQuestion.answerGroups.forEach((group, groupIndex) => {
      group.answers.forEach((answer, answerIndex) => {
        if (answer.imageFile) {
          const path = `questions/${question.id}/groups/${group.id}/answers/${answer.id}`;
          const upload$ = this.uploadImageFile(answer.imageFile, path).pipe(
            map(downloadUrl => {
              updatedQuestion.answerGroups[groupIndex].answers[answerIndex].imageUrl = downloadUrl;
              delete updatedQuestion.answerGroups[groupIndex].answers[answerIndex].imageFile;
              return true;
            })
          );
          uploads.push(upload$);
        }
      });
    });

    // If no uploads, return the question as is
    if (uploads.length === 0) {
      return of(updatedQuestion);
    }

    // Process all uploads and return the updated question
    return forkJoin(uploads).pipe(
      map(() => updatedQuestion),
      catchError(error => {
        console.error('Error uploading images:', error);
        return throwError(() => new Error(`Failed to upload images: ${error.message}`));
      })
    );
  }

  /**
   * Upload a single image file to Firebase Storage
   */
  private uploadImageFile(file: File, path: string): Observable<string> {
    // Create a unique file name
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const storageRef = ref(this.storage, `${path}/${fileName}`);
    
    // Upload the file
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    // Create an Observable that resolves with the download URL when the upload completes
    return new Observable<string>(observer => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Optional: Track upload progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress}%`);
        },
        (error) => {
          // Handle upload errors
          observer.error(error);
        },
        async () => {
          // Upload completed successfully, get download URL
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            observer.next(downloadURL);
            observer.complete();
          } catch (error) {
            observer.error(error);
          }
        }
      );
    });
  }

  /**
   * Prepares question data for Firestore by removing File objects
   * and adding timestamps
   */
  private prepareQuestionData(question: Question): any {
    // Create a copy without File objects
    const questionData: any = { ...question };
    
    // Add timestamps
    questionData.updatedAt = serverTimestamp();
    if (!question.createdAt) {
      questionData.createdAt = serverTimestamp();
    }
    
    // Remove any File objects that might still be present
    delete questionData.imageFile;
    
    // Handle answer groups
    if (questionData.answerGroups) {
      questionData.answerGroups = questionData.answerGroups.map((group: AnswerGroup) => {
        const newGroup = { ...group };
        
        if (newGroup.answers) {
          newGroup.answers = newGroup.answers.map((answer: Answer) => {
            const newAnswer = { ...answer };
            delete newAnswer.imageFile;
            return newAnswer;
          });
        }
        
        return newGroup;
      });
    }
    
    return questionData;
  }
} 