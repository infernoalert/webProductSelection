import { Routes } from '@angular/router';
import { QuestionFormComponent } from './admin/question-form/question-form.component';
import { QuestionListComponent } from './components/admin/question-list/question-list.component';

export const routes: Routes = [
  // Admin routes
  { path: 'admin/questions', component: QuestionListComponent },
  { path: 'admin/questions/new', component: QuestionFormComponent },
  { path: 'admin/questions/edit/:id', component: QuestionFormComponent },
  
  { path: '', redirectTo: 'admin/questions', pathMatch: 'full' }
];
