import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { switchMap, catchError, finalize } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid'; // For generating IDs client-side if needed

import { QuestionService } from '../../services/question.service'; // Corrected path
import { Question, AnswerGroup, Answer } from '../../models/question.model'; // Corrected path

@Component({
  selector: 'app-question-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink], // Add necessary modules
  templateUrl: './question-form.component.html',
  styleUrls: ['./question-form.component.scss'] // Corrected property name
})
export class QuestionFormComponent implements OnInit, OnDestroy {
  // Injected services
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private questionService = inject(QuestionService);

  // Component properties
  questionForm!: FormGroup; // Definite assignment in ngOnInit
  isEditMode = false;
  questionId: string | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  imagePreviews: { question?: string | ArrayBuffer | null, answers: { [key: string]: string | ArrayBuffer | null } } = { answers: {} }; // For image previews

  // Subscriptions
  private routeSub: Subscription | null = null;
  private saveSub: Subscription | null = null;

  ngOnInit(): void {
    this.initForm(); // Initialize the base form structure

    this.routeSub = this.route.paramMap.pipe(
      switchMap(params => {
        this.questionId = params.get('id');
        if (this.questionId) {
          this.isEditMode = true;
          this.isLoading = true;
          return this.questionService.getQuestion(this.questionId).pipe(
            catchError(err => {
              this.errorMessage = `Error loading question: ${err.message}`;
              this.isLoading = false;
              return of(null); // Return null on error to continue the stream
            })
          );
        } else {
          this.isEditMode = false;
          // Ensure at least one group and one answer exist for new questions
          this.addAnswerGroup();
          return of(null); // No fetching needed for new question
        }
      })
    ).subscribe(question => {
      if (question) {
        this.patchForm(question); // Populate form if question data is loaded
      }
      this.isLoading = false; // Ensure loading is off after fetch/patch
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.saveSub?.unsubscribe();
  }

  // --- Form Initialization and Patching ---

  private initForm(): void {
    this.questionForm = this.fb.group({
      text: ['', Validators.required],
      description: [''],
      isRequired: [false],
      isFirstQuestion: [false], // Added isFirstQuestion
      imageFile: [null], // For storing the selected question image file
      answerGroups: this.fb.array([])
    });
  }

  private patchForm(question: Question): void {
    this.questionForm.patchValue({
      text: question.text,
      description: question.description,
      isRequired: question.required ?? false,
      isFirstQuestion: question.isFirstQuestion ?? false, // Patch isFirstQuestion
      // imageFile remains null initially when patching
    });

    // Set question image preview if URL exists
    if (question.imageUrl) {
      this.imagePreviews.question = question.imageUrl;
    }

    // Clear existing groups and populate with data
    const answerGroupsArray = this.questionForm.get('answerGroups') as FormArray;
    answerGroupsArray.clear(); // Clear previous groups

    question.answerGroups?.forEach((group, groupIndex) => {
      const groupForm = this.createAnswerGroup(group);
      answerGroupsArray.push(groupForm);

      // Set answer image previews
      group.answers.forEach((answer, answerIndex) => {
        if (answer.imageUrl) {
           this.imagePreviews.answers[`${groupIndex}-${answerIndex}`] = answer.imageUrl;
        }
      });
    });
  }

  // --- Form Group/Array Creation ---

  createAnswerGroup(group?: AnswerGroup): FormGroup {
    const groupForm = this.fb.group({
      id: [group?.id || uuidv4()], // Assign ID if not present
      name: [group?.name || ''],
      answers: this.fb.array(
        group?.answers?.map(answer => this.createAnswer(answer)) || []
      )
    });
     // Ensure at least one answer exists when creating/patching
     if (!group || !group.answers || group.answers.length === 0) {
        (groupForm.get('answers') as FormArray).push(this.createAnswer());
     }
    return groupForm;
  }

  createAnswer(answer?: Answer): FormGroup {
    return this.fb.group({
      id: [answer?.id || uuidv4()], // Assign ID if not present
      text: [answer?.text || '', Validators.required],
      isCorrect: [answer?.isCorrect ?? false],
      imageFile: [null] // For storing the selected answer image file
      // imageUrl is handled via preview/patching
    });
  }

  // --- FormArray Getters ---

  get answerGroups(): FormArray {
    return this.questionForm.get('answerGroups') as FormArray;
  }

  answers(groupIndex: number): FormArray {
    return this.answerGroups.at(groupIndex).get('answers') as FormArray;
  }

  // --- FormArray Manipulation Methods ---

  addAnswerGroup(): void {
    this.answerGroups.push(this.createAnswerGroup());
     // Ensure the new group has at least one answer field
     this.addAnswer(this.answerGroups.length - 1);
  }

  removeAnswerGroup(index: number): void {
    this.answerGroups.removeAt(index);
    // Clean up associated image previews if needed (more complex)
  }

  addAnswer(groupIndex: number): void {
    this.answers(groupIndex).push(this.createAnswer());
  }

  removeAnswer(groupIndex: number, answerIndex: number): void {
    this.answers(groupIndex).removeAt(answerIndex);
    delete this.imagePreviews.answers[`${groupIndex}-${answerIndex}`]; // Clean preview
  }

  // --- Image Handling ---

  onQuestionImageSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files[0]) {
      const file = element.files[0];
      this.questionForm.patchValue({ imageFile: file }); // Store the file object
      // Generate preview
      const reader = new FileReader();
      reader.onload = (e) => this.imagePreviews.question = e.target?.result ?? null;
      reader.readAsDataURL(file);
    }
  }

  onAnswerImageSelected(event: Event, groupIndex: number, answerIndex: number): void {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files[0]) {
      const file = element.files[0];
      // Store the file object in the correct answer FormGroup
      this.answers(groupIndex).at(answerIndex).patchValue({ imageFile: file });
      // Generate preview
      const reader = new FileReader();
      const previewKey = `${groupIndex}-${answerIndex}`;
      reader.onload = (e) => this.imagePreviews.answers[previewKey] = e.target?.result ?? null;
      reader.readAsDataURL(file);
    }
  }

  // --- Form Submission ---

  onSubmit(): void {
    this.questionForm.markAllAsTouched(); // Mark fields for validation display

    if (this.questionForm.invalid) {
      this.errorMessage = 'Please correct the errors in the form.';
      console.log('Form Errors:', this.questionForm.errors); // Log form errors
      // Log errors in controls
       Object.keys(this.questionForm.controls).forEach(key => {
        const controlErrors = this.questionForm.get(key)?.errors;
        if (controlErrors != null) {
          console.log('Key control: ' + key + ', errors: ' + JSON.stringify(controlErrors));
        }
      });
      // Log errors in answer groups/answers
      this.answerGroups.controls.forEach((group, i) => {
         Object.keys((group as FormGroup).controls).forEach(key => {
            const controlErrors = group.get(key)?.errors;
            if (controlErrors != null) {
                console.log(`Group ${i}, Key control: ${key}, errors: ${JSON.stringify(controlErrors)}`);
            }
         });
         this.answers(i).controls.forEach((answer, j) => {
             Object.keys((answer as FormGroup).controls).forEach(key => {
                const controlErrors = answer.get(key)?.errors;
                if (controlErrors != null) {
                    console.log(`Group ${i}, Answer ${j}, Key control: ${key}, errors: ${JSON.stringify(controlErrors)}`);
                }
            });
         });
      });

      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const questionData = this.prepareDataForSave();

    this.saveSub = this.questionService.saveQuestion(questionData).pipe(
      finalize(() => this.isLoading = false), // Ensure loading state is turned off
      catchError(err => {
        this.errorMessage = `Error saving question: ${err.message}`;
        return of(null); // Prevent observable from completing on error
      })
    ).subscribe(result => {
      if (result) { // Only navigate if save was successful (result is the ID)
        this.router.navigate(['/admin/questions']); // Navigate back to list on success
      }
      // If result is null, error message is already set
    });
  }

  private prepareDataForSave(): Question {
     const formValue = this.questionForm.value;
     const question: Question = {
        // Use existing ID in edit mode, otherwise it's undefined (service handles new ID)
        id: this.isEditMode ? this.questionId! : undefined,
        text: formValue.text,
        description: formValue.description,
        required: formValue.isRequired,
        isFirstQuestion: formValue.isFirstQuestion, // Include isFirstQuestion
        imageFile: formValue.imageFile, // Include the file object
        answerGroups: formValue.answerGroups.map((group: any) => ({
           id: group.id, // Make sure IDs are carried over
           name: group.name,
           answers: group.answers.map((answer: any) => ({
              id: answer.id, // Make sure IDs are carried over
              text: answer.text,
              isCorrect: answer.isCorrect,
              imageFile: answer.imageFile // Include the file object
           }))
        }))
     };
     return question;
  }
}
