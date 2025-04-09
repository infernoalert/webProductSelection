import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Question } from '../models/question.model';

@Injectable({
  providedIn: 'root'
})
export class QuestionService {
  private readonly collectionName = 'questions';

  constructor(private firestore: AngularFirestore) {}

  getQuestions(): Observable<Question[]> {
    return this.firestore.collection<Question>(this.collectionName).valueChanges({ idField: 'id' });
  }

  getQuestionById(id: string): Observable<Question | undefined> {
    return this.firestore.doc<Question>(`${this.collectionName}/${id}`).valueChanges();
  }

  saveQuestion(question: Question): Observable<string> {
    if (question.id) {
      // Update existing question
      return from(this.firestore.doc(`${this.collectionName}/${question.id}`).update(question))
        .pipe(map(() => question.id as string));
    } else {
      // Create new question
      return from(this.firestore.collection(this.collectionName).add(question))
        .pipe(map(ref => ref.id));
    }
  }

  deleteQuestion(id: string): Observable<void> {
    return from(this.firestore.doc(`${this.collectionName}/${id}`).delete());
  }
} 