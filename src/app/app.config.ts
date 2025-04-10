import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { 
  getFirestore, 
  provideFirestore, 
  connectFirestoreEmulator, 
  enableMultiTabIndexedDbPersistence 
} from '@angular/fire/firestore';
import { getStorage, provideStorage, connectStorageEmulator } from '@angular/fire/storage';
import { environment } from '../environments/environment';
import { provideZoneChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => {
      const firestore = getFirestore();
      if (!environment.production) {
        // Enable emulator connection
        connectFirestoreEmulator(firestore, 'localhost', 8090);
        console.log('Connected to Firestore emulator on port 8090');
      }
      // Enable offline persistence
      enableMultiTabIndexedDbPersistence(firestore)
        .catch((err) => {
          if (err.code === 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
          } else if (err.code === 'unimplemented') {
            console.warn('The current browser does not support persistence.');
          }
        });
      return firestore;
    }),
    provideStorage(() => {
      const storage = getStorage();
      if (!environment.production) {
        connectStorageEmulator(storage, 'localhost', 9190);
        console.log('Connected to Storage emulator on port 9190');
      }
      return storage;
    })
  ]
};
