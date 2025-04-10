import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuestionService } from '../../../services/question.service';
import { Question, AnswerGroup, Answer } from '../../../models/question.model';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-question-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <h2>{{ isEditMode ? 'Edit' : 'Create' }} Question</h2>
      
      <form [formGroup]="questionForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="questionNumber">Question Number *</label>
          <input 
            type="number" 
            id="questionNumber" 
            formControlName="questionNumber" 
            class="form-control"
            [class.is-invalid]="submitted && f['questionNumber'].errors"
          >
          <div *ngIf="submitted && f['questionNumber'].errors" class="invalid-feedback">
            <div *ngIf="f['questionNumber'].errors['required']">Question number is required</div>
            <div *ngIf="f['questionNumber'].errors['min']">Question number must be at least 1</div>
          </div>
        </div>
        
        <div class="form-group">
          <label for="questionText">Question Text *</label>
          <input 
            type="text" 
            id="questionText" 
            formControlName="text" 
            class="form-control"
            [class.is-invalid]="submitted && f['text'].errors"
          >
          <div *ngIf="submitted && f['text'].errors" class="invalid-feedback">
            <div *ngIf="f['text'].errors['required']">Question text is required</div>
          </div>
        </div>
        
        <div class="form-group">
          <label for="image">Question Image</label>
          <input 
            type="file" 
            id="image" 
            (change)="onQuestionImageSelected($event)" 
            class="form-control"
            accept="image/*"
          >
        </div>
        
        <h3>Answer Groups</h3>
        
        <div formArrayName="answerGroups">
          <div *ngFor="let groupForm of answerGroupForms.controls; let i = index">
            <div [formGroupName]="i" class="card mb-3">
              <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                  <h4>Group {{ i + 1 }}</h4>
                  <button 
                    type="button" 
                    class="btn btn-danger" 
                    (click)="removeAnswerGroup(i)"
                  >Remove</button>
                </div>
              </div>
              
              <div class="card-body">
                <div class="form-group">
                  <label [for]="'groupName' + i">Group Name</label>
                  <input 
                    [id]="'groupName' + i" 
                    type="text" 
                    formControlName="name" 
                    class="form-control"
                  >
                </div>
                
                <h5>Answers</h5>
                
                <div formArrayName="answers">
                  <div *ngFor="let answerForm of getAnswerForms(i).controls; let j = index">
                    <div [formGroupName]="j" class="card mb-2">
                      <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                          <div class="flex-grow-1 mr-2">
                            <div class="form-group">
                              <label [for]="'answerText' + i + '-' + j">Answer Text *</label>
                              <input 
                                [id]="'answerText' + i + '-' + j" 
                                type="text" 
                                formControlName="text" 
                                class="form-control"
                                [class.is-invalid]="submitted && answerForm.get('text')?.errors"
                              >
                              <div *ngIf="submitted && answerForm.get('text')?.errors" class="invalid-feedback">
                                <div *ngIf="answerForm.get('text')?.errors?.['required']">Answer text is required</div>
                              </div>
                            </div>
                            
                            <div class="form-group mt-2">
                              <label [for]="'nextQuestion' + i + '-' + j">Next Question Number (Optional)</label>
                              <input 
                                [id]="'nextQuestion' + i + '-' + j" 
                                type="number" 
                                formControlName="nextQuestion" 
                                class="form-control"
                                placeholder="Enter question number to go to next"
                              >
                              <small class="form-text text-muted">Leave empty to continue to the next question in sequence</small>
                            </div>
                            
                            <div class="form-group mt-2">
                              <label [for]="'answerImage' + i + '-' + j">Answer Image</label>
                              <input 
                                [id]="'answerImage' + i + '-' + j" 
                                type="file" 
                                (change)="onAnswerImageSelected($event, i, j)" 
                                class="form-control"
                                accept="image/*"
                              >
                            </div>
                          </div>
                          
                          <button 
                            type="button" 
                            class="btn btn-danger" 
                            (click)="removeAnswer(i, j)"
                          >Remove</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button 
                  type="button" 
                  class="btn btn-secondary" 
                  (click)="addAnswer(i)"
                >Add Answer</button>
              </div>
            </div>
          </div>
        </div>
        
        <button 
          type="button" 
          class="btn btn-secondary mb-3" 
          (click)="addAnswerGroup()"
        >Add Answer Group</button>
        
        <div class="form-group">
          <button 
            type="submit" 
            class="btn btn-primary"
            [disabled]="saving"
          >
            {{ saving ? 'Saving...' : 'Save Question' }}
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
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .form-group {
      margin-bottom: 15px;
    }
    
    .card {
      margin-bottom: 15px;
    }
  `]
})
export class QuestionFormComponent implements OnInit {
  questionForm: FormGroup;
  submitted = false;
  saving = false;
  error: string | null = null;
  success = false;
  questionId?: string;
  isEditMode = false;
  
  constructor(
    private questionService: QuestionService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.questionForm = this.fb.group({
      questionNumber: [null, [Validators.required, Validators.min(1)]],
      text: ['', Validators.required],
      imageFile: [null],
      answerGroups: this.fb.array([])
    });
    
    // Add an initial answer group with one answer
    this.addAnswerGroup();
  }
  
  ngOnInit(): void {
    // Check if we're in edit mode
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.questionId = params['id'];
        this.loadQuestion(params['id']);
      }
    });
  }
  
  loadQuestion(id: string): void {
    this.questionService.getQuestionById(id).subscribe({
      next: (question) => {
        if (question) {
          this.populateForm(question);
        } else {
          this.error = 'Question not found';
        }
      },
      error: (error) => {
        this.error = 'Error loading question: ' + error.message;
      }
    });
  }
  
  populateForm(question: Question): void {
    this.questionForm.patchValue({
      questionNumber: question.questionNumber,
      text: question.text
    });
    
    // Clear existing answer groups
    while (this.answerGroupForms.length) {
      this.answerGroupForms.removeAt(0);
    }
    
    // Add answer groups from the question
    if (question.answerGroups && question.answerGroups.length > 0) {
      question.answerGroups.forEach(group => {
        const answerGroup = this.fb.group({
          id: [group.id],
          name: [group.name || ''],
          answers: this.fb.array([])
        });
        
        const answers = answerGroup.get('answers') as FormArray;
        
        group.answers.forEach(answer => {
          answers.push(this.fb.group({
            id: [answer.id],
            text: [answer.text, Validators.required],
            nextQuestion: [answer.nextQuestion || null],
            imageFile: [null]
          }));
        });
        
        this.answerGroupForms.push(answerGroup);
      });
    } else {
      // Add at least one answer group if none exist
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
  
  // Create a new answer group with at least one answer
  addAnswerGroup() {
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
  removeAnswerGroup(index: number) {
    this.answerGroupForms.removeAt(index);
  }
  
  // Add a new answer to an answer group
  addAnswer(groupIndex: number) {
    const answerGroup = this.answerGroupForms.at(groupIndex);
    const answers = answerGroup.get('answers') as FormArray;
    
    answers.push(this.fb.group({
      id: [uuidv4()],
      text: ['', Validators.required],
      nextQuestion: [null],
      imageFile: [null]
    }));
  }
  
  // Remove an answer from an answer group
  removeAnswer(groupIndex: number, answerIndex: number) {
    this.getAnswerForms(groupIndex).removeAt(answerIndex);
  }
  
  // Handle file selection for question image
  onQuestionImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.questionForm.patchValue({
        imageFile: file
      });
    }
  }
  
  // Handle file selection for answer images
  onAnswerImageSelected(event: Event, groupIndex: number, answerIndex: number) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const answerForm = this.getAnswerForms(groupIndex).at(answerIndex);
      answerForm.patchValue({
        imageFile: file
      });
    }
  }
  
  // Submit the form
  onSubmit() {
    this.submitted = true;
    this.error = null;
    this.success = false;
    
    if (this.questionForm.invalid) {
      return;
    }
    
    this.saving = true;
    
    // Create a Question object from the form
    const formValue = this.questionForm.value;
    
    // Ensure questionNumber is a valid number
    const questionNumber = parseInt(formValue.questionNumber, 10);
    
    if (isNaN(questionNumber) || questionNumber < 1) {
      this.error = 'Please enter a valid question number (must be at least 1)';
      this.saving = false;
      return;
    }
    
    // Check if the question number is unique
    this.questionService.isQuestionNumberUnique(questionNumber, this.questionId).subscribe(
      isUnique => {
        if (!isUnique) {
          this.error = `Question number ${questionNumber} is already in use. Please choose a different number.`;
          this.saving = false;
          return;
        }
        
        // Continue with saving if the number is unique
        const question: Question = {
          questionNumber: questionNumber,
          text: formValue.text,
          imageFile: formValue.imageFile || null,
          answerGroups: formValue.answerGroups.map((group: any) => ({
            id: group.id,
            answers: group.answers.map((answer: any) => ({
              id: answer.id,
              text: answer.text,
              imageFile: answer.imageFile || null
            }))
          }))
        };
        
        // If in edit mode, set the ID
        if (this.isEditMode && this.questionId) {
          question.id = this.questionId;
        }
        
        // Save the question
        this.questionService.saveQuestion(question).subscribe(
          id => {
            this.success = true;
            this.saving = false;
            
            if (!this.isEditMode) {
              // Reset form after successful submission only in create mode
              this.resetForm();
            }
          },
          error => {
            this.error = 'Error saving question: ' + error.message;
            this.saving = false;
          }
        );
      },
      error => {
        this.error = 'Error checking question number: ' + error.message;
        this.saving = false;
      }
    );
  }
  
  // Reset the form after successful submission
  resetForm() {
    this.questionForm.reset({
      questionNumber: null,
      text: '',
      imageFile: null
    });
    
    // Clear the answer groups
    while (this.answerGroupForms.length) {
      this.answerGroupForms.removeAt(0);
    }
    
    // Add a default answer group
    this.addAnswerGroup();
    
    this.submitted = false;
    this.error = null;
    this.success = false;
  }
} 