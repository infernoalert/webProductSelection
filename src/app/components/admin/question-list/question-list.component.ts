import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { QuestionService } from '../../../services/question.service';
import { Question } from '../../../models/question.model';
import { Observable } from 'rxjs';

interface FirebaseTimestamp {
  toDate(): Date;
}

@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container">
      <div class="header d-flex justify-content-between align-items-center mb-4">
        <h2>Questions</h2>
        <button class="btn btn-primary" [routerLink]="['/admin/questions/new']">Add New Question</button>
      </div>

      <div class="alert alert-info" *ngIf="loading">Loading questions...</div>
      <div class="alert alert-warning" *ngIf="!loading && questions?.length === 0">
        No questions found. Create your first question!
      </div>

      <div class="table-responsive" *ngIf="questions && questions.length > 0">
        <table class="table table-striped table-hover">
          <thead>
            <tr>
              <th>Question Text</th>
              <th>Answer Groups</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let question of questions">
              <td>{{ question.text | slice:0:50 }}{{ question.text.length > 50 ? '...' : '' }}</td>
              <td>{{ question.answerGroups?.length || 0 }}</td>
              <td>{{ formatCreatedDate(question.createdAt) }}</td>
              <td>
                <div class="btn-group">
                  <button 
                    class="btn btn-sm btn-outline-primary" 
                    [routerLink]="['/admin/questions/edit', question.id]"
                  >
                    Edit
                  </button>
                  <button 
                    class="btn btn-sm btn-outline-danger" 
                    (click)="deleteQuestion(question.id)"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="alert alert-danger mt-3" *ngIf="error">
        {{ error }}
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 20px auto;
      padding: 0 15px;
    }
    
    .header {
      margin-bottom: 20px;
    }

    .table th, .table td {
      vertical-align: middle;
    }
  `]
})
export class QuestionListComponent implements OnInit {
  private questionService = inject(QuestionService);
  
  questions: Question[] = [];
  loading = true;
  error: string | null = null;
  
  ngOnInit(): void {
    this.loadQuestions();
  }
  
  loadQuestions(): void {
    this.loading = true;
    this.error = null;
    
    this.questionService.getQuestions().subscribe({
      next: (questions: Question[]) => {
        this.questions = questions;
        this.loading = false;
      },
      error: (error: Error) => {
        this.error = `Error loading questions: ${error.message}`;
        this.loading = false;
      }
    });
  }
  
  deleteQuestion(id: string | undefined): void {
    if (!id) return;
    
    if (!confirm('Are you sure you want to delete this question?')) {
      return;
    }
    
    this.questionService.deleteQuestion(id).subscribe({
      next: () => {
        this.questions = this.questions.filter(q => q.id !== id);
      },
      error: (error: Error) => {
        this.error = `Error deleting question: ${error.message}`;
      }
    });
  }
  
  formatCreatedDate(timestamp: any): string {
    if (!timestamp) return 'N/A';
    
    try {
      // Handle Firebase Timestamp
      if (timestamp && typeof timestamp.toDate === 'function') {
        const date = timestamp.toDate();
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      }
      
      // Handle Date object
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString();
      }
      
      // Handle string timestamp
      if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      }
      
      return 'Invalid date';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Error';
    }
  }
}
