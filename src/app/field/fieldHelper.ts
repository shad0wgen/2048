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

  public static mergeNumber(number: number): number {
    return number ? number *= 2 : 0;
  }

  public static movingDistance(firstPosition: number, destPosition: number, merged: boolean): number {
    let result = firstPosition - destPosition;
    return result + Number(merged);
  }
}