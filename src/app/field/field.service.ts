import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { Direction } from './enums/direction';
import { MergeMovement } from './enums/mergeMovement';
import { FieldHelper } from './fieldHelper';
import { AnimationState } from './interfaces/animationState';
import { Coordinate } from './interfaces/coordinate';
import { FieldState } from './interfaces/fieldState';

export const size = 4;
const winningNumber = 2048;

@Injectable({
  providedIn: 'root'
})
export class FieldService {
  private mergeGuard: Coordinate[];
  private field: FieldState = FieldHelper.createGrid(size, 0);
  // Custom fieldstate, for debugging purposes
  // private field: FieldState = [
  //   [2,4,2,4],
  //   [4,2,4,2],
  //   [2,4,2,4],
  //   [0,2,4,2],
  // ]
  private animations: AnimationState = FieldHelper.createGrid(size, 'base');
  private fieldAnimationSource: BehaviorSubject<{
    field: FieldState, animations: AnimationState
  }> = new BehaviorSubject({ field: this.field, animations: this.animations });
  public readonly field$: Observable<{
    field: FieldState, animations: AnimationState
  }> = this.fieldAnimationSource.asObservable();
  private hasWon = false;
  private hasWonSource: Subject<boolean> = new Subject();
  public readonly hasWon$: Observable<boolean> = this.hasWonSource.asObservable();
  private hasLost = false;
  private hasLostSource: Subject<boolean> = new Subject();
  public readonly hasLost$: Observable<boolean> = this.hasLostSource.asObservable();

  constructor() { }

  public move(direction: Direction) {
    this.mergeGuard = <Coordinate[]>[];
    switch (direction) {
      case Direction.Down: this.searchNumberHorizontally(true); break;
      case Direction.Up: this.searchNumberHorizontally(false); break;
      case Direction.Left: this.searchNumberVertically(true); break;
      case Direction.Right: this.searchNumberVertically(false); break;
    }
    this.addNewNumber();
    this.fieldAnimationSource.next({ field: this.field, animations: this.animations });
    this.hasWonSource.next(this.hasWon);
    this.hasLostSource.next(this.hasLost);
  }

  private updateAnimations(yIndex: number, xIndex: number, moveDistance: number, direction: Direction): void {
    const animationDirectionString = 'move' + direction + '-' + moveDistance;
    this.animations[yIndex][xIndex] = animationDirectionString;
  }

  public resetAnimations(): AnimationState {
    return this.animations = FieldHelper.createGrid(size, 'base');
  }

  // Down: Search from bottom left and up, skip bottom row
  // Up:   Search from top left and down, skip top row
  private searchNumberHorizontally(down: boolean): void {
    let yIndex = down ? size - 2 : 1;
    for (; down ? yIndex >= 0 : yIndex < size; down ? yIndex-- : yIndex++) {
      for (let xIndex = 0; xIndex < size; xIndex++) {
        if (this.field[yIndex][xIndex]) { // Tile got a number to move?
          this.searchMergeOrMove(down ? Direction.Down : Direction.Up, yIndex, xIndex, yIndex, true);
        }
      }
    }
  }

  // Left:  Search from top left and down, skip left column
  // Right: Search from top right and down, skip right column
  private searchNumberVertically(left: boolean): void {
    for (let yIndex = 0; yIndex < size; yIndex++) {
      let xIndex = left ? 1 : size - 2;
      for (; left ? xIndex < size : xIndex >= 0; left ? xIndex++ : xIndex--) {
        if (this.field[yIndex][xIndex]) { // Tile got a number?
          this.searchMergeOrMove(left ? Direction.Left : Direction.Right, xIndex, xIndex, yIndex, false);
        }
      }
    }
  }

  private searchMergeOrMove(direction: Direction, startIndex: number, xIndex: number, yIndex: number, vertically: boolean): void {
    const downOrRight = direction === Direction.Down || direction === Direction.Right;

    // Search for a number to merge, or move current number
    const stopLimit = (searchIndex: number) => downOrRight ? searchIndex < size : searchIndex >= 0;
    for (let searchIndex = startIndex; stopLimit(searchIndex); downOrRight ? searchIndex++ : searchIndex--) {
      const mergeXIndex = vertically ? xIndex : searchIndex;
      const mergeYIndex = vertically ? searchIndex : yIndex;
      let mergeResult = this.mergeOrMove(this.field, mergeYIndex, mergeXIndex, direction);

      // No more moves? Calculate moved distance.
      if (mergeResult !== MergeMovement.Moved) {
        const startPosition = downOrRight ? searchIndex : startIndex;
        const destPosition = downOrRight ? startIndex : searchIndex;
        const md = FieldHelper.movingDistance(startPosition, destPosition, mergeResult === MergeMovement.Mergerd);
        this.updateAnimations(
          vertically ? startIndex : yIndex,
          vertically ? xIndex : startIndex,
          md, direction);
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

      const isMerged = !!this.mergeGuard.find(c => c.x === xDestIndex && c.y === yDestIndex);
      const destEmpty = !field[yDestIndex][xDestIndex];
      const mergeable = field[yDestIndex][xDestIndex] === tileValue;
      switch (true) {
        case isMerged:
          return MergeMovement.NotMoved;
        case destEmpty:
          // Move to destination
          field[yDestIndex][xDestIndex] = tileValue;
          field[yIndex][xIndex] = 0;
          return MergeMovement.Moved;
        case mergeable:
          const mergedNumber = field[yDestIndex][xDestIndex] * 2;
          if (mergedNumber === winningNumber) {
            this.hasWon = true;
          }
          field[yDestIndex][xDestIndex] = mergedNumber;
          field[yIndex][xIndex] = 0;
          this.mergeGuard.push(<Coordinate>{ y: yDestIndex, x: xDestIndex }); // Mark as merged in this move
          return MergeMovement.Mergerd;
        default:
          return MergeMovement.NotMoved; // Not mergeable
      }

    }
    else {
      // Out of bounds
      return MergeMovement.NotMoved;
    }
  }

  public addNewNumber() {
    let emptyCoordinates = this.getEmptyCoordinates();
    if (emptyCoordinates.length) {
      const randomIndex = Math.floor(Math.random() * emptyCoordinates.length);
      this.field[emptyCoordinates[randomIndex].x][emptyCoordinates[randomIndex].y] = FieldHelper.getNewNumber();
      emptyCoordinates = this.getEmptyCoordinates();
    }
    if (!this.movesAvailable(emptyCoordinates)) {
      this.hasLost = true;
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
