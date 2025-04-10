import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { QuestionService } from '../../../services/question.service';
import { Question } from '../../../models/question.model';

@Component({
  selector: 'app-question-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './question-list.component.html',
  styleUrls: ['./question-list.component.scss']
})
export class QuestionListComponent implements OnInit {
  questions: Question[] = [];
  loading = true;
  error: string | null = null;
  
  private questionService = inject(QuestionService);
  
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
    
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString();
    }
    
    if (typeof timestamp?.toDate === 'function') {
      return timestamp.toDate().toLocaleString();
    }
    
    return 'Invalid date';
  }
  
  /**
   * Check if a question has any answers with nextQuestion specified
   */
  hasNextQuestions(question: Question): boolean {
    if (!question.answerGroups || question.answerGroups.length === 0) {
      return false;
    }
    
    return question.answerGroups.some(group => 
      group.answers.some(answer => answer.nextQuestion !== undefined && answer.nextQuestion !== null)
    );
  }
  
  /**
   * Get all unique nextQuestion values from a question's answers
   */
  getNextQuestions(question: Question): number[] {
    if (!question.answerGroups || question.answerGroups.length === 0) {
      return [];
    }
    
    const nextQuestions = new Set<number>();
    
    question.answerGroups.forEach(group => {
      group.answers.forEach(answer => {
        if (answer.nextQuestion !== undefined && answer.nextQuestion !== null) {
          nextQuestions.add(answer.nextQuestion);
        }
      });
    });
    
    return Array.from(nextQuestions).sort((a, b) => a - b);
  }
}
