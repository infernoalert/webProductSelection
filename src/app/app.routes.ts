import { Routes } from '@angular/router';
import { QuestionFormComponent } from './components/question-form/question-form.component';

export const routes: Routes = [
  { path: 'questions/new', component: QuestionFormComponent },
  { path: '', redirectTo: 'questions/new', pathMatch: 'full' }
];
