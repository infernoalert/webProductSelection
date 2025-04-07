export interface Answer {
  id: string;
  text: string;
  isCorrect?: boolean;
  imageUrl?: string;
  imageFile?: File;
}

export interface AnswerGroup {
  id: string;
  name?: string;
  answers: Answer[];
}

export interface Question {
  id?: string;
  text: string;
  description?: string;
  imageUrl?: string;
  imageFile?: File;
  answerGroups: AnswerGroup[];
  required?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
} 