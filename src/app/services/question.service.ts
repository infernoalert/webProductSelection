import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp, 
  where,
  collectionData,
  docData
} from '@angular/fire/firestore';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Question } from '../models/question.model';

@Injectable({
  providedIn: 'root'
})
export class QuestionService {
  private readonly firestore: Firestore = inject(Firestore);
  private readonly collectionName = 'questions';

  // Helper to convert Firestore timestamps and add ID
  private mapFirestoreData(docData: any): Question {
    return {
      ...docData,
      id: docData.id,
      createdAt: docData['createdAt']?.toDate(),
      updatedAt: docData['updatedAt']?.toDate()
    } as Question;
  }

  // Helper to prepare data for Firestore
  private prepareQuestionData(question: Question): any {
    const data: any = {
      text: question.text,
      questionNumber: Number(question.questionNumber),
      updatedAt: serverTimestamp(),
      ...(question.imageFile && { imageFile: question.imageFile })
    };

    if (!question.id) {
      data.createdAt = serverTimestamp();
    }

    if (question.answerGroups?.length) {
      data.answerGroups = question.answerGroups.map(group => ({
        id: group.id,
        answers: group.answers.map(answer => ({
          id: answer.id,
          text: answer.text,
          ...(answer.imageFile && { imageFile: answer.imageFile }),
          ...(answer.nextQuestion && { nextQuestion: answer.nextQuestion })
        }))
      }));
    }

    return data;
  }

  getQuestions(): Observable<Question[]> {
    const questionsRef = collection(this.firestore, this.collectionName);
    const questionsQuery = query(questionsRef, orderBy('questionNumber', 'asc'));
    
    return collectionData(questionsQuery, { idField: 'id' }).pipe(
      map(questions => questions.map(q => this.mapFirestoreData(q))),
      catchError(error => {
        console.error('Error fetching questions:', error);
        return throwError(() => new Error('Failed to fetch questions. Please try again later.'));
      })
    );
  }

  getQuestionById(id: string): Observable<Question | undefined> {
    const docRef = doc(this.firestore, this.collectionName, id);
    
    return docData(docRef, { idField: 'id' }).pipe(
      map(data => data ? this.mapFirestoreData(data) : undefined),
      catchError(error => {
        console.error(`Error fetching question with ID ${id}:`, error);
        return throwError(() => new Error('Failed to fetch question. Please try again later.'));
      })
    );
  }

  isQuestionNumberUnique(questionNumber: number, excludeId?: string): Observable<boolean> {
    const questionsRef = collection(this.firestore, this.collectionName);
    const q = query(questionsRef, where('questionNumber', '==', questionNumber));
    
    return collectionData(q, { idField: 'id' }).pipe(
      map(snapshot => {
        if (snapshot.length === 0) {
          return true;
        }
        if (excludeId) {
          return !snapshot.some(doc => doc.id !== excludeId);
        }
        return false;
      }),
      catchError(error => {
        console.error(`Error checking uniqueness for question number ${questionNumber}:`, error);
        return throwError(() => new Error('Failed to check question number uniqueness. Please try again later.'));
      })
    );
  }

  saveQuestion(question: Question): Observable<string> {
    const cleanData = this.prepareQuestionData(question);
    
    if (question.id) {
      return from(updateDoc(doc(this.firestore, this.collectionName, question.id), cleanData)).pipe(
        map(() => question.id as string),
        catchError(error => {
          console.error(`Error updating question with ID ${question.id}:`, error);
          return throwError(() => new Error('Failed to update question. Please try again later.'));
        })
      );
    } else {
      return from(addDoc(collection(this.firestore, this.collectionName), cleanData)).pipe(
        map(ref => ref.id),
        catchError(error => {
          console.error('Error creating new question:', error);
          return throwError(() => new Error('Failed to create question. Please try again later.'));
        })
      );
    }
  }

  deleteQuestion(id: string): Observable<void> {
    return from(deleteDoc(doc(this.firestore, this.collectionName, id))).pipe(
      catchError(error => {
        console.error(`Error deleting question with ID ${id}:`, error);
        return throwError(() => new Error('Failed to delete question. Please try again later.'));
      })
    );
  }
}