import { Routes } from '@angular/router';
import { QuestionFormComponent } from './components/question-form/question-form.component';
import { QuestionListComponent } from './components/admin/question-list/question-list.component';
import { QuestionManagerComponent } from './components/admin/question-manager/question-manager.component';

export const routes: Routes = [
  // Admin routes
  { path: 'admin/questions', component: QuestionListComponent },
  { path: 'admin/questions/new', component: QuestionManagerComponent },
  { path: 'admin/questions/edit/:id', component: QuestionManagerComponent },
  
  // Original routes
  { path: 'questions/new', component: QuestionFormComponent },
  { path: '', redirectTo: 'admin/questions', pathMatch: 'full' }
];
