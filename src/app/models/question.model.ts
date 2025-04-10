export interface Answer {
  id: string;
  text: string;
  imageUrl?: string;
  imageFile?: File;
  nextQuestion?: number; // Optional field to specify which question to go to next
}

export interface AnswerGroup {
  id: string;
  name?: string; // Optional name for the answer group
  answers: Answer[];
}

export interface Question {
  id?: string;
  questionNumber: number;  // Unique number for each question, starting from 1
  text: string;
  imageUrl?: string;
  imageFile?: File;
  answerGroups: AnswerGroup[];
  createdAt?: Date;
  updatedAt?: Date;
} 