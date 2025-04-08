import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { QuestionService } from '../../../services/question.service';
import { Question } from '../../../models/question.model';

interface FirebaseTimestamp {
  toDate(): Date;
}

@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './question-list.component.html',
  styleUrls: ['./question-list.component.scss']
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
      if (timestamp && typeof timestamp.toDate === 'function') {
        const date = timestamp.toDate();
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      }
      
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString();
      }
      
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
