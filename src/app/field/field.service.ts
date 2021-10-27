import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Direction } from './enums/direction';
import { MergeMovement } from './enums/mergeMovement';
import { FieldHelper } from './fieldHelper';
import { AnimationState } from './interfaces/animationState';
import { Coordinate } from './interfaces/coordinate';
import { FieldState } from './interfaces/fieldState';

export const size = 4;

@Injectable({
  providedIn: 'root'
})
export class FieldService {
  private mergeGuard: Coordinate[];
  private field: FieldState = FieldHelper.createGrid(size, 0);
  private animations: AnimationState = FieldHelper.createGrid(size, 'base');
  private fieldAnimationSource: BehaviorSubject<{
    field: FieldState, animations: AnimationState
  }> = new BehaviorSubject({ field: this.field, animations: this.animations });
  public readonly field$: Observable<{
    field: FieldState, animations: AnimationState
  }> = this.fieldAnimationSource.asObservable();

  constructor() { }

  public move(direction: Direction) {
    this.mergeGuard = <Coordinate[]>[];
    switch (direction) {
      case Direction.Down: this.moveDown(); break;
      case Direction.Up: this.moveUp(); break;
      case Direction.Left: this.moveLeft(); break;
      case Direction.Right: this.moveRight(); break;
    }
    this.addNewNumber();
    this.fieldAnimationSource.next({ field: this.field, animations: this.animations });
  }

  private updateAnimations(yIndex: number, xIndex: number, moveDistance: number, direction: Direction): void {
    const animationDirectionString = 'move' + direction + '-' + moveDistance;
    this.animations[yIndex][xIndex] = animationDirectionString;
  }

  public resetAnimations(): AnimationState {
    return this.animations = FieldHelper.createGrid(size, 'base');
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
      // No more moves? Calculate moved distance.
      if (mergeResult !== MergeMovement.Moved) {
        const md = FieldHelper.movingDistance(searchIndex, yStartIndex, mergeResult === MergeMovement.Mergerd);
        this.updateAnimations(yStartIndex, xIndex, md, Direction.Down);
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
      // No more moves? Calculate moved distance.
      if (mergeResult !== MergeMovement.Moved) {
        const md = FieldHelper.movingDistance(xStartIndex, searchIndex, mergeResult === MergeMovement.Mergerd);
        this.updateAnimations(yIndex, xStartIndex, md, Direction.Left);
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
      // No more moves? Calculate moved distance.
      if (mergeResult !== MergeMovement.Moved) {
        const md = FieldHelper.movingDistance(searchIndex, xStartIndex, mergeResult === MergeMovement.Mergerd);
        this.updateAnimations(yIndex, xStartIndex, md, Direction.Right);
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
        this.updateAnimations(yStartIndex, xIndex, md, Direction.Up);
        break;
      }
    }
  }

  private mergeOrMove(field: FieldState, yIndex: number, xIndex: number, direction: Direction): MergeMovement {
    const tileValue = field[yIndex][xIndex];
    // Calculate destination coordinates
    const yDestIndex = FieldHelper.calcYDestIndex(direction, yIndex);
    const xDestIndex = FieldHelper.calcXDestIndex(direction, xIndex);
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
          this.mergeGuard.push(<Coordinate>{ x: yDestIndex, y: xDestIndex }); // Mark as merged in this move
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

  public addNewNumber() {
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
}
