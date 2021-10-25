import { Component, HostListener, OnInit } from '@angular/core';
import { compile } from './animations';
import { Direction } from './enums/direction';
import { MergeMovement } from './enums/mergeMovement';
import { FieldHelper } from './fieldHelper';
import { Coordinate } from './interfaces/coordinate';

export const size = 4;
export type FieldState = number[][]; // [y][x] Index represents coordinates
export type FieldView = number[][]; // Used in template
export type AnimationState = Animation[][];
export type Animation = string; // TODO: Enum?
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
  private animations: AnimationState;
  public animationsView: AnimationState; // TODO: Make @Input from field.service
  private field: FieldState = FieldHelper.createGrid(size, 0);
  private mergeGuard: Coordinate[];
  public tileHeight = 100;
  public tileWidth = 100;
  public fieldView: FieldView;
  public backgroundGrid = FieldHelper.createGrid(size, null);

  // The field index layout. Zeroes in field are hidden in template.
  //   0 1 2 3
  // 0 * * * *
  // 1 * * * *
  // 2 * * * *
  // 3 * * * *
  // 3 * * * *

  constructor() { }

  ngOnInit() {
    this.resetAnimations();
    this.addNewNumber();
    this.render(false);
  }

  @HostListener('document:keydown.ArrowDown', ['$event.target'])
  arrowDown() {
    this.move(Direction.Down);
  };

  @HostListener('document:keydown.ArrowLeft', ['$event.target'])
  arrowLeft() {
    this.move(Direction.Left);
  };

  @HostListener('document:keydown.ArrowRight', ['$event.target'])
  arrowRight() {
    this.move(Direction.Right);
  };

  @HostListener('document:keydown.ArrowUp', ['$event.target'])
  arrowUp() {
    this.move(Direction.Up);
  };

  private move(direction: Direction) {
    this.mergeGuard = <Coordinate[]>[];
    switch (direction) {
      case Direction.Down:  this.moveDown();  break;
      case Direction.Up:    this.moveUp();    break;
      case Direction.Left:  this.moveLeft();  break;
      case Direction.Right: this.moveRight(); break;
    }
    this.addNewNumber();
    this.render();
  }

  private moveDown(): void {
    // Search from bottom left and up, skip bottom row
    for (let yIndex = size - 2; yIndex >= 0; yIndex--) {
      for (let xIndex = 0; xIndex < size; xIndex++) {
        if (this.field[yIndex][xIndex]) { // Tile got a number to move?
          this.mergeOrMovedDownwards(yIndex, xIndex);
        }
      }
    }
  }

  private mergeOrMovedDownwards(yStartIndex: number, xIndex: number): void {
    // Search for a number to merge, or move current number
    for (let searchIndex = yStartIndex; searchIndex < size; searchIndex++) {
      let mergeResult = this.mergeOrMove(this.field, searchIndex, xIndex, Direction.Down);
      if (mergeResult !== MergeMovement.Moved) {
        const md = FieldHelper.movingDistance(searchIndex, yStartIndex, mergeResult === MergeMovement.Mergerd);
        this.animations[yStartIndex][xIndex] = `moveDown-${md}`;
        break;
      }
    }
  }

  private moveLeft() {
    // Search from top left and down, skip left column
    for (let xIndex = 1; xIndex < size; xIndex++) {
      for (let yIndex = 0; yIndex < size; yIndex++) {
        if (this.field[yIndex][xIndex]) { // Tile got a number?
          this.mergeOrMoveLeft(xIndex, yIndex);
        }
      }
    }
  }

  private mergeOrMoveLeft(xStartIndex: number, yIndex: number) {
    // Search for a number to merge or move current number
    for (let searchIndex = xStartIndex; searchIndex >= 0; searchIndex--) {
      let mergeResult = this.mergeOrMove(this.field, yIndex, searchIndex, Direction.Left);
      if (mergeResult !== MergeMovement.Moved) {
        const md = FieldHelper.movingDistance(xStartIndex, searchIndex, mergeResult === MergeMovement.Mergerd);
        this.animations[yIndex][xStartIndex] = `moveLeft-${md}`;
        break;
      }
    }
  }

  private moveRight() {
    // Search from top right and down, skip right column
    for (let yIndex = 0; yIndex < size; yIndex++) {
      for (let xIndex = size - 2; xIndex >= 0; xIndex--) {
        if (this.field[yIndex][xIndex]) { // Tile got a number?
          this.mergeOrMoveRight(xIndex, yIndex);
        }
      }
    }
  }

  private mergeOrMoveRight(xStartIndex: number, yIndex: number): void {
    // Search for a number to merge or move current number
    for (let searchIndex = xStartIndex; searchIndex < size; searchIndex++) {
      let mergeResult = this.mergeOrMove(this.field, yIndex, searchIndex, Direction.Right);
      if (mergeResult !== MergeMovement.Moved) {
        const md = FieldHelper.movingDistance(searchIndex, xStartIndex, mergeResult === MergeMovement.Mergerd);
        this.animations[yIndex][xStartIndex] = `moveRight-${md}`;
        break;
      }
    }
  }

  private moveUp() {
    // Search from top left and down, skip top row
    for (let yIndex = 1; yIndex < size; yIndex++) {
      for (let xIndex = 0; xIndex < size; xIndex++) {
        if (this.field[yIndex][xIndex]) { // Tile got a number?
          this.mergeOrMoveUp(yIndex, xIndex);
        }
      }
    }
  }

  private mergeOrMoveUp(yStartIndex: number, xIndex: number): void {
    // Search for a number to merge or move current number
    for (let searchIndex = yStartIndex; searchIndex >= 0; searchIndex--) {
      let mergeResult = this.mergeOrMove(this.field, searchIndex, xIndex, Direction.Up);
      // No more moves? Calculate moved distance.
      if (mergeResult !== MergeMovement.Moved) {
        const md = FieldHelper.movingDistance(yStartIndex, searchIndex, mergeResult === MergeMovement.Mergerd);
        this.animations[yStartIndex][xIndex] = `moveUp-${md}`;
        break;
      }
    }
  }

  private mergeOrMove(field: FieldState, yIndex: number, xIndex: number, direction: Direction): MergeMovement {
    const tileValue = field[yIndex][xIndex];
    // Calculate destination coordinates
    const d = Direction;
    const yDestIndex = direction === d.Up ? yIndex - 1 : direction === d.Down ? yIndex + 1 : yIndex;
    const xDestIndex = direction === d.Left ? xIndex - 1 : direction === d.Right ? xIndex + 1 : xIndex;
    if (FieldHelper.isInBounds(xDestIndex, yDestIndex, size)) {
      if (this.mergeGuard.find(c => c.x === xDestIndex && c.y === yDestIndex)) { // Already merged?
        return MergeMovement.NotMoved;
      } else {
        if (!field[yDestIndex][xDestIndex]) { // Destination empty?
          // Move to destination
          field[yDestIndex][xDestIndex] = tileValue;
          field[yIndex][xIndex] = 0;
          return MergeMovement.Moved;
        } else if (field[yDestIndex][xDestIndex] === tileValue) { // Mergeable?
          field[yDestIndex][xDestIndex] = FieldHelper.mergeNumber(field[yDestIndex][xDestIndex]);
          field[yIndex][xIndex] = 0;
          this.mergeGuard.push(<Coordinate>{x: yDestIndex, y: xDestIndex}); // Mark as merged in this move
          return MergeMovement.Mergerd;
        }
        else {
          // Not mergeable
          return MergeMovement.NotMoved;
        }
      }
    }
    else {
      // Out of bounds
      return MergeMovement.NotMoved;
    }
  }

  private addNewNumber() {
    let emptyCoordinates = this.getEmptyCoordinates();
    if (!this.movesAvailable(emptyCoordinates)) {
      alert('Game over!');
    }
    const randomIndex = Math.floor(Math.random() * emptyCoordinates.length);
    if (emptyCoordinates.length) {
      this.field[emptyCoordinates[randomIndex].x][emptyCoordinates[randomIndex].y] = FieldHelper.getNewNumber();
    }
  }

  private getEmptyCoordinates(): Coordinate[] {
    let result: Coordinate[] = new Array();
    this.field.forEach((row, rowIndex) => {
      row.forEach((tile, tileIndex) => {
        if (!tile) {
          result.push(<Coordinate>{ x: rowIndex, y: tileIndex });
        }
      });
    });
    return result;
  }

  private movesAvailable(emptyCoordinates: Coordinate[]): boolean {
    let result = false;
    let matchesCount = 0;
    if (emptyCoordinates.length > 0) {
      result = true;
    } else {
      // Check the field for mergeable numbers
      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          matchesCount += this.neighbourTileMatches(<Coordinate>{ x: x, y: y });
        }
      }
    }
    if (matchesCount) {
      result = true;
    }
    return result;
  }

  private neighbourTileMatches(c: Coordinate): number { // Check all neighbouring tiles for matches. Return 1 if match
    for (let x = Math.max(0, c.x - 1); x <= Math.min(c.x + 1, size - 1); x++) { // Check beside
      if (x === c.x) {
        continue; // Don't check startingpoint
      }
      if (this.field[c.y][x] === this.field[c.y][c.x]) {
        return 1;
      }
    }
    for (let y = Math.max(0, c.y - 1); y <= Math.min(c.y + 1, size - 1); y++) { // Check above and below
      if (y === c.y) {
        continue; // Don't check startingpoint
      }
      if (this.field[y][c.x] === this.field[c.y][c.x]) {
        return 1;
      }
    }
    return 0;
  }

  private render(animate = true) {
    if (animate) {
      this.animationsView = FieldHelper.clone(this.animations);
      setTimeout(() => {
        // TODO: Improve solution
        // When animation has finished, copy moved values to viewValues. DOM gets rerendered after animation.
        // Possible improvement:
        // Store field in service, set this.field as @Input and ChangedetectionStrategy onPush
        // Avoid rerendering after animation.
        this.resetAnimations();
        this.animationsView = FieldHelper.clone(this.animations);
        this.fieldView = FieldHelper.clone(this.field);
      }, animationDuration - 5);
    }
    else {
      this.animationsView = FieldHelper.clone(this.animations);
      this.fieldView = FieldHelper.clone(this.field);
    }
  }

  private resetAnimations() {
    this.animations = FieldHelper.createGrid(size, 'base');
  }
}
