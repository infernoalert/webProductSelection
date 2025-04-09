export interface Answer {
  id: string;
  text: string;
  imageUrl?: string;
  imageFile?: File;
  isCorrect: boolean;
}

export interface AnswerGroup {
  id: string;
  answers: Answer[];
}

export interface Question {
  id?: string;
  text: string;
  imageUrl?: string;
  imageFile?: File;
  answerGroups: AnswerGroup[];
  createdAt?: Date;
  updatedAt?: Date;
} 