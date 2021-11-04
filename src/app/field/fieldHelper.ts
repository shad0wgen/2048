import { Direction } from './enums/direction';

export class FieldHelper {
  public static createGrid(size: number, fill: any): any[][] {
    return Array.from(Array(size), () => Array(size).fill(fill));
  }

  public static clone(state: any) {
    let copy = <any>[];
    state.forEach((row: any) => {
      copy.push([...row]);
    });
    return copy;
  }

  public static getNewNumber(): number {
    return Math.random() > 0.5 ? 2 : 4;
  }

  public static isInBounds(x: number, y: number, size: number): boolean {
    return (y >= 0 && y < size && x >= 0 && x < size);
  }

  public static movingDistance(startPosition: number, destPosition: number, merged: boolean): number {
    let result = startPosition - destPosition;
    return result + Number(merged);
  }

  public static calcYDestIndex(direction: Direction, yIndex: number): number {
    return direction === Direction.Up ? yIndex - 1 : direction === Direction.Down ? yIndex + 1 : yIndex;
  }

  public static calcXDestIndex(direction: Direction, xIndex: number): number {
    return direction === Direction.Left ? xIndex - 1 : direction === Direction.Right ? xIndex + 1 : xIndex;
  }
}