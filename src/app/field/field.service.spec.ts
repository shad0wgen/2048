import { TestBed } from '@angular/core/testing';

import { FieldService } from './field.service';
import { AnimationState } from './interfaces/animationState';
import { FieldState } from './interfaces/fieldState';

describe('FieldService', () => {
  let service: FieldService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FieldService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add number 2 or 4 to the field', () => {
    service.addNewNumber();
    service.field$.subscribe((f: {field: FieldState , animations: AnimationState}) => {
      const addedNumber = f.field.find(row => row.find(number => number === 2 || number === 4));
      expect(addedNumber).toBeTruthy();
    })
  })
});
