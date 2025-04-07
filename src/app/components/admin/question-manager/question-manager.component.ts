import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuestionService } from '../../../services/question.service';
import { Question, AnswerGroup, Answer } from '../../../models/question.model';
import { switchMap, of, catchError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-question-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="container">
      <div class="header d-flex justify-content-between align-items-center mb-4">
        <h2>{{ isEditMode ? 'Edit Question' : 'Add New Question' }}</h2>
        <button class="btn btn-secondary" [routerLink]="['/admin/questions']">Back to Questions</button>
      </div>

      <div class="alert alert-info" *ngIf="loading">
        {{ isEditMode ? 'Loading question...' : 'Initializing form...' }}
      </div>

      <form [formGroup]="questionForm" (ngSubmit)="onSubmit()" *ngIf="!loading">
        <!-- Question Details Section -->
        <div class="card mb-4">
          <div class="card-header bg-primary text-white">
            <h3 class="mb-0">Question Details</h3>
          </div>
          <div class="card-body">
            <div class="form-group mb-3">
              <label for="questionText" class="form-label">Question Text *</label>
              <input 
                type="text" 
                id="questionText" 
                formControlName="text" 
                class="form-control"
                [class.is-invalid]="submitted && f['text'].errors"
                placeholder="Enter the question text"
              >
              <div *ngIf="submitted && f['text'].errors" class="invalid-feedback">
                <div *ngIf="f['text'].errors['required']">Question text is required</div>
              </div>
            </div>
            
            <div class="form-group mb-3">
              <label for="description" class="form-label">Description (Optional)</label>
              <textarea 
                id="description" 
                formControlName="description" 
                class="form-control"
                rows="3"
                placeholder="Add additional context or instructions"
              ></textarea>
            </div>
            
            <div class="form-group mb-3">
              <label for="questionImage" class="form-label">Question Image (Optional)</label>
              <input 
                type="file" 
                id="questionImage" 
                class="form-control"
                (change)="onQuestionImageSelected($event)" 
                accept="image/*"
              >
              <div *ngIf="currentQuestion?.imageUrl" class="mt-2">
                <div class="d-flex align-items-center">
                  <div class="image-preview me-3">
                    <img [src]="currentQuestion!.imageUrl" alt="Question image" class="img-thumbnail" style="max-height: 100px;">
                  </div>
                  <div>
                    <p class="mb-1"><small>Current image</small></p>
                    <button type="button" class="btn btn-sm btn-outline-danger" (click)="onRemoveQuestionImage()">
                      Remove Image
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-check mb-3">
              <input 
                type="checkbox" 
                id="required" 
                formControlName="required" 
                class="form-check-input"
              >
              <label for="required" class="form-check-label">
                Required Question
              </label>
            </div>
          </div>
        </div>

        <!-- Answer Groups Section -->
        <div class="card mb-4">
          <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h3 class="mb-0">Answer Groups</h3>
            <button 
              type="button" 
              class="btn btn-light" 
              (click)="addAnswerGroup()"
            >
              Add Group
            </button>
          </div>
          <div class="card-body">
            <div *ngIf="answerGroupForms.length === 0" class="alert alert-warning">
              No answer groups added. Please add at least one group.
            </div>

            <div formArrayName="answerGroups">
              <div *ngFor="let groupForm of answerGroupForms.controls; let i = index" class="mb-4">
                <div [formGroupName]="i" class="card border-secondary">
                  <div class="card-header bg-secondary text-white d-flex justify-content-between align-items-center">
                    <h4 class="mb-0">Group {{ i + 1 }}</h4>
                    <button 
                      type="button" 
                      class="btn btn-light" 
                      (click)="removeAnswerGroup(i)"
                      [disabled]="answerGroupForms.length === 1"
                    >
                      Remove Group
                    </button>
                  </div>
                  
                  <div class="card-body">
                    <div class="form-group mb-3">
                      <label [for]="'groupName' + i" class="form-label">Group Name (Optional)</label>
                      <input 
                        [id]="'groupName' + i" 
                        type="text" 
                        formControlName="name" 
                        class="form-control"
                        placeholder="Enter a name for this group of answers"
                      >
                    </div>
                    
                    <h5 class="mb-3 d-flex justify-content-between align-items-center">
                      <span>Answers</span>
                      <button 
                        type="button" 
                        class="btn btn-sm btn-outline-primary" 
                        (click)="addAnswer(i)"
                      >
                        Add Answer
                      </button>
                    </h5>
                    
                    <div formArrayName="answers">
                      <div *ngIf="getAnswerForms(i).length === 0" class="alert alert-warning">
                        No answers added to this group. Please add at least one answer.
                      </div>

                      <div *ngFor="let answerForm of getAnswerForms(i).controls; let j = index" class="mb-3">
                        <div [formGroupName]="j" class="card border-light">
                          <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                              <div class="flex-grow-1 me-3">
                                <div class="form-group mb-3">
                                  <label [for]="'answerText' + i + '-' + j" class="form-label">Answer Text *</label>
                                  <input 
                                    [id]="'answerText' + i + '-' + j" 
                                    type="text" 
                                    formControlName="text" 
                                    class="form-control"
                                    [class.is-invalid]="submitted && answerForm.get('text')?.errors"
                                    placeholder="Enter answer text"
                                  >
                                  <div *ngIf="submitted && answerForm.get('text')?.errors" class="invalid-feedback">
                                    <div *ngIf="answerForm.get('text')?.errors?.['required']">Answer text is required</div>
                                  </div>
                                </div>
                                
                                <div class="form-group mb-3">
                                  <label [for]="'answerImage' + i + '-' + j" class="form-label">Answer Image (Optional)</label>
                                  <input 
                                    [id]="'answerImage' + i + '-' + j" 
                                    type="file" 
                                    class="form-control"
                                    (change)="onAnswerImageSelected($event, i, j)" 
                                    accept="image/*"
                                  >
                                  <div *ngIf="getAnswerImageUrl(i, j)" class="mt-2">
                                    <div class="d-flex align-items-center">
                                      <div class="image-preview me-3">
                                        <img [src]="getAnswerImageUrl(i, j)" alt="Answer image" class="img-thumbnail" style="max-height: 80px;">
                                      </div>
                                      <div>
                                        <button type="button" class="btn btn-sm btn-outline-danger" (click)="onRemoveAnswerImage(i, j)">
                                          Remove Image
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div class="form-check mb-2">
                                  <input 
                                    [id]="'answerCorrect' + i + '-' + j" 
                                    type="checkbox" 
                                    formControlName="isCorrect" 
                                    class="form-check-input"
                                  >
                                  <label [for]="'answerCorrect' + i + '-' + j" class="form-check-label">
                                    Mark as Correct Answer
                                  </label>
                                </div>
                              </div>
                              
                              <button 
                                type="button" 
                                class="btn btn-outline-danger" 
                                (click)="removeAnswer(i, j)"
                                [disabled]="getAnswerForms(i).length === 1"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="form-actions d-flex justify-content-between mb-4">
          <button 
            type="button" 
            class="btn btn-secondary" 
            [routerLink]="['/admin/questions']"
          >
            Cancel
          </button>
          
          <button 
            type="submit" 
            class="btn btn-primary"
            [disabled]="saving"
          >
            <span *ngIf="saving" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            {{ saving ? 'Saving...' : (isEditMode ? 'Update' : 'Save') }}
          </button>
        </div>
        
        <div *ngIf="error" class="alert alert-danger mt-3">
          {{ error }}
        </div>
        
        <div *ngIf="success" class="alert alert-success mt-3">
          Question saved successfully!
        </div>
      </form>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1000px;
      margin: 20px auto;
      padding: 0 15px;
    }
    
    .card {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 1.5rem;
    }
    
    .form-label {
      font-weight: 500;
    }
    
    .card-header h3, .card-header h4 {
      font-size: 1.1rem;
      font-weight: 600;
    }
  `]
})
export class QuestionManagerComponent implements OnInit {
  private fb = inject(FormBuilder);
  private questionService = inject(QuestionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  questionForm!: FormGroup;
  currentQuestion: Question | null = null;
  isEditMode = false;
  questionId: string | undefined = undefined;
  
  loading = true;
  submitted = false;
  saving = false;
  error: string | null = null;
  success = false;
  
  // Track images to remove
  imageToRemove = false;
  answerImagesToRemove: {[key: string]: boolean} = {};
  
  ngOnInit(): void {
    console.log('QuestionManagerComponent initialized');
    this.initForm();
    
    // Check if we're in edit mode
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        console.log('Route params:', { id });
        this.questionId = id || undefined;
        this.isEditMode = !!id;
        
        if (id) {
          console.log('Loading question with ID:', id);
          return this.questionService.getQuestion(id).pipe(
            catchError(error => {
              console.error('Error loading question:', error);
              this.error = `Could not load question: ${error.message}`;
              this.loading = false;
              return of(null);
            })
          );
        } else {
          console.log('Creating new question');
          return of(null);
        }
      })
    ).subscribe(question => {
      console.log('Question loaded:', question);
      if (question) {
        this.currentQuestion = question;
        this.populateForm(question);
      }
      
      this.loading = false;
    });
  }
  
  // Initialize the form
  private initForm(): void {
    this.questionForm = this.fb.group({
      text: ['', Validators.required],
      description: [''],
      required: [false],
      answerGroups: this.fb.array([])
    });
    
    // Add initial answer group with one answer
    this.addAnswerGroup();
  }
  
  // Populate form with existing question data
  private populateForm(question: Question): void {
    this.questionForm.patchValue({
      text: question.text,
      description: question.description || '',
      required: question.required || false
    });
    
    // Clear default answer groups
    while (this.answerGroupForms.length > 0) {
      this.answerGroupForms.removeAt(0);
    }
    
    // Add answer groups from the question
    if (question.answerGroups && question.answerGroups.length > 0) {
      question.answerGroups.forEach(group => {
        const groupForm = this.fb.group({
          id: [group.id],
          name: [group.name || ''],
          answers: this.fb.array([])
        });
        
        this.answerGroupForms.push(groupForm);
        
        const answersArray = groupForm.get('answers') as FormArray;
        
        // Add answers to the group
        if (group.answers && group.answers.length > 0) {
          group.answers.forEach(answer => {
            answersArray.push(this.fb.group({
              id: [answer.id],
              text: [answer.text, Validators.required],
              isCorrect: [answer.isCorrect || false],
              imageUrl: [answer.imageUrl || '']
            }));
          });
        } else {
          // Add a default answer if none exist
          answersArray.push(this.createAnswerFormGroup());
        }
      });
    } else {
      // Add a default answer group if none exist
      this.addAnswerGroup();
    }
  }
  
  // Getters for easy access to form
  get f(): { [key: string]: AbstractControl } { 
    return this.questionForm.controls; 
  }
  
  get answerGroupForms(): FormArray { 
    return this.f['answerGroups'] as FormArray; 
  }
  
  getAnswerForms(groupIndex: number): FormArray {
    return this.answerGroupForms.at(groupIndex).get('answers') as FormArray;
  }
  
  // Helper to get the image URL for an answer
  getAnswerImageUrl(groupIndex: number, answerIndex: number): string | null {
    if (!this.currentQuestion) return null;
    
    const group = this.currentQuestion.answerGroups[groupIndex];
    if (!group || !group.answers) return null;
    
    const answer = group.answers[answerIndex];
    if (!answer) return null;
    
    return answer.imageUrl || null;
  }
  
  // Create a new answer group
  addAnswerGroup(): void {
    const answerGroup = this.fb.group({
      id: [uuidv4()],
      name: [''],
      answers: this.fb.array([])
    });
    
    this.answerGroupForms.push(answerGroup);
    
    // Add a default answer
    this.addAnswer(this.answerGroupForms.length - 1);
  }
  
  // Remove an answer group
  removeAnswerGroup(index: number): void {
    if (this.answerGroupForms.length <= 1) {
      return; // Keep at least one group
    }
    
    this.answerGroupForms.removeAt(index);
  }
  
  // Create a new answer form group
  createAnswerFormGroup(): FormGroup {
    return this.fb.group({
      id: [uuidv4()],
      text: ['', Validators.required],
      isCorrect: [false],
      imageUrl: ['']
    });
  }
  
  // Add a new answer to a group
  addAnswer(groupIndex: number): void {
    const answers = this.getAnswerForms(groupIndex);
    answers.push(this.createAnswerFormGroup());
  }
  
  // Remove an answer from a group
  removeAnswer(groupIndex: number, answerIndex: number): void {
    const answers = this.getAnswerForms(groupIndex);
    
    if (answers.length <= 1) {
      return; // Keep at least one answer per group
    }
    
    // Mark image for removal if it exists
    this.markAnswerImageForRemoval(groupIndex, answerIndex);
    
    answers.removeAt(answerIndex);
  }
  
  // Handle question image selection
  onQuestionImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      this.imageToRemove = false;
      this.questionForm.patchValue({ imageFile: file });
    }
  }
  
  // Handle answer image selection
  onAnswerImageSelected(event: Event, groupIndex: number, answerIndex: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      const answerId = this.getAnswerForms(groupIndex).at(answerIndex).get('id')?.value;
      if (answerId) {
        delete this.answerImagesToRemove[answerId];
      }
      
      this.getAnswerForms(groupIndex).at(answerIndex).patchValue({
        imageFile: file
      });
    }
  }
  
  // Remove the question image
  onRemoveQuestionImage(): void {
    this.imageToRemove = true;
    this.questionForm.patchValue({ imageFile: null });
    
    if (this.currentQuestion) {
      this.currentQuestion.imageUrl = undefined;
    }
  }
  
  // Remove an answer image
  onRemoveAnswerImage(groupIndex: number, answerIndex: number): void {
    this.markAnswerImageForRemoval(groupIndex, answerIndex);
    
    // Also update the UI
    if (this.currentQuestion && 
        this.currentQuestion.answerGroups[groupIndex] && 
        this.currentQuestion.answerGroups[groupIndex].answers[answerIndex]) {
      this.currentQuestion.answerGroups[groupIndex].answers[answerIndex].imageUrl = undefined;
    }
  }
  
  // Mark an answer image for removal
  markAnswerImageForRemoval(groupIndex: number, answerIndex: number): void {
    const answerId = this.getAnswerForms(groupIndex).at(answerIndex).get('id')?.value;
    
    if (answerId) {
      this.answerImagesToRemove[answerId] = true;
    }
  }
  
  // Form submission
  onSubmit(): void {
    this.submitted = true;
    this.error = null;
    this.success = false;
    
    // Check if the form is valid
    if (this.questionForm.invalid) {
      this.error = "Please fix the errors in the form before submitting.";
      // Scroll to top of page to show error
      window.scrollTo(0, 0);
      return;
    }
    
    this.saving = true;
    
    // Build the question object from the form
    const formValue = this.questionForm.value;
    const question: Question = {
      id: this.questionId,
      text: formValue.text,
      description: formValue.description,
      required: formValue.required,
      answerGroups: formValue.answerGroups,
      imageFile: formValue.imageFile
    };
    
    // Handle image removal
    if (this.isEditMode && this.imageToRemove && this.currentQuestion?.imageUrl) {
      question.imageUrl = undefined; // Signal to remove the image
    }
    
    // Handle answer image removals
    if (this.isEditMode && Object.keys(this.answerImagesToRemove).length > 0) {
      question.answerGroups.forEach(group => {
        group.answers.forEach(answer => {
          if (this.answerImagesToRemove[answer.id]) {
            answer.imageUrl = undefined; // Signal to remove the image
          }
        });
      });
    }
    
    // Save the question
    this.questionService.saveQuestion(question).subscribe({
      next: (id) => {
        this.saving = false;
        this.success = true;
        
        // Navigate back to the list after a short delay
        setTimeout(() => {
          this.router.navigate(['/admin/questions']);
        }, 1500);
      },
      error: (error: Error) => {
        this.error = `Error saving question: ${error.message}`;
        this.saving = false;
        
        // Scroll to top of page to show error
        window.scrollTo(0, 0);
      }
    });
  }
}
