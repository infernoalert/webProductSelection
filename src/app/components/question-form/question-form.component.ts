import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { QuestionService } from '../../services/question.service';
import { Question, AnswerGroup, Answer } from '../../models/question.model';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-question-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <h2>Create Question</h2>
      
      <form [formGroup]="questionForm" (ngSubmit)="onSubmit()">
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
          <label for="description">Description</label>
          <textarea 
            id="description" 
            formControlName="description" 
            class="form-control"
          ></textarea>
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
                            
                            <div class="form-group">
                              <label [for]="'answerImage' + i + '-' + j">Answer Image</label>
                              <input 
                                [id]="'answerImage' + i + '-' + j" 
                                type="file" 
                                (change)="onAnswerImageSelected($event, i, j)" 
                                class="form-control"
                                accept="image/*"
                              >
                            </div>
                            
                            <div class="form-check">
                              <input 
                                [id]="'answerCorrect' + i + '-' + j" 
                                type="checkbox" 
                                formControlName="isCorrect" 
                                class="form-check-input"
                              >
                              <label [for]="'answerCorrect' + i + '-' + j" class="form-check-label">
                                Correct Answer
                              </label>
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
export class QuestionFormComponent {
  private questionService = inject(QuestionService);
  private fb = inject(FormBuilder);
  
  questionForm: FormGroup;
  submitted = false;
  saving = false;
  error: string | null = null;
  success = false;
  
  constructor() {
    this.questionForm = this.fb.group({
      text: ['', Validators.required],
      description: [''],
      answerGroups: this.fb.array([])
    });
    
    // Add an initial answer group with one answer
    this.addAnswerGroup();
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
    const answers = this.getAnswerForms(groupIndex);
    
    const answer = this.fb.group({
      id: [uuidv4()],
      text: ['', Validators.required],
      isCorrect: [false]
    });
    
    answers.push(answer);
  }
  
  // Remove an answer from an answer group
  removeAnswer(groupIndex: number, answerIndex: number) {
    const answers = this.getAnswerForms(groupIndex);
    answers.removeAt(answerIndex);
  }
  
  // Handle file selection for question image
  onQuestionImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      // Store the file in the form data
      this.questionForm.patchValue({
        imageFile: file
      });
    }
  }
  
  // Handle file selection for answer images
  onAnswerImageSelected(event: Event, groupIndex: number, answerIndex: number) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      // Store the file in the specific answer
      const answer = this.getAnswerForms(groupIndex).at(answerIndex);
      answer.patchValue({
        imageFile: file
      });
    }
  }
  
  // Submit the form
  onSubmit() {
    this.submitted = true;
    this.error = null;
    this.success = false;
    
    // Check if the form is valid
    if (this.questionForm.invalid) {
      return;
    }
    
    this.saving = true;
    
    // Create a Question object from the form
    const formData = this.questionForm.value;
    const question: Question = {
      text: formData.text,
      description: formData.description,
      imageFile: formData.imageFile,
      answerGroups: formData.answerGroups
    };
    
    // Save the question using the service
    this.questionService.saveQuestion(question).subscribe({
      next: (questionId) => {
        console.log('Question saved with ID:', questionId);
        this.saving = false;
        this.success = true;
        this.resetForm();
      },
      error: (error) => {
        console.error('Error saving question:', error);
        this.error = error.message;
        this.saving = false;
      }
    });
  }
  
  // Reset the form after successful submission
  private resetForm() {
    this.submitted = false;
    this.questionForm.reset();
    
    // Clear answer groups
    while (this.answerGroupForms.length > 0) {
      this.answerGroupForms.removeAt(0);
    }
    
    // Add an initial answer group with one answer
    this.addAnswerGroup();
  }
} 