import { Component, HostListener, OnInit } from '@angular/core';
import { compile } from './animations';
import { Direction } from './enums/direction';
import { FieldService, size } from './field.service';
import { FieldHelper } from './fieldHelper';
import { takeWhile } from 'rxjs/operators';
import { FieldState } from './interfaces/fieldState';
import { FieldView } from './interfaces/fieldView';
import { AnimationState } from './interfaces/animationState';

export const animationDuration = 120;

@Component({
  selector: 'app-field',
  templateUrl: './field.component.html',
  styleUrls: ['./field.component.scss'],
  animations: [
    compile(size, animationDuration),
  ],
})
export class FieldComponent implements OnInit {
  public animationsView: AnimationState;
  public tileHeight = 100;
  public tileWidth = 100;
  public fieldView: FieldView;
  public backgroundGrid = FieldHelper.createGrid(size, null);
  public componentActive = true;

  // The field index layout. Zeroes in field are hidden in template.
  //   0 1 2 3
  // 0 * * * *
  // 1 * * * *
  // 2 * * * *
  // 3 * * * *
  // 3 * * * *

  constructor(
    public fs: FieldService
  ) { }

  ngOnInit(): void {
    this.fs.addNewNumber();

    this.fs.field$.pipe(
      takeWhile(() => this.componentActive),
    ).subscribe(({ field, animations }) => {
      this.render(field, animations)
    });

    this.fs.resetAnimations();
  }

  @HostListener('document:keydown.ArrowDown', ['$event.target'])
  arrowDown(): void {
    this.fs.move(Direction.Down);
  };

  @HostListener('document:keydown.ArrowLeft', ['$event.target'])
  arrowLeft(): void {
    this.fs.move(Direction.Left);
  };

  @HostListener('document:keydown.ArrowRight', ['$event.target'])
  arrowRight(): void {
    this.fs.move(Direction.Right);
  };

  @HostListener('document:keydown.ArrowUp', ['$event.target'])
  arrowUp(): void {
    this.fs.move(Direction.Up);
  };

  // When animation has finished, copy moved values to the view (viewValues).
  // TODO: Improve solution!
  // Possible improvement:
  // Create tile component that contains previous x,y and new x,y, pass those to animation.
  // Make field a one dimensional array containing this tile type.
  private render(field: FieldState, animations: AnimationState): void {
    this.animationsView = FieldHelper.clone(animations);
    setTimeout(() => {
      this.animationsView = this.fs.resetAnimations();
      this.fieldView = FieldHelper.clone(field);
    }, animationDuration - 20);
  }

  ngOnDestroy(): void {
    this.componentActive = false;
  }
}
