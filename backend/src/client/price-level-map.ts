import { OrderedMap } from "@js-sdsl/ordered-map";

export class PriceLevelMap {
  private map = new OrderedMap<number, number>();

  set(price: number, size: number): void {
    if (size <= 0) {
      this.map.eraseElementByKey(price);
    } else {
      this.map.setElement(price, size);
    }
  }

  get(price: number): number | undefined {
    return this.map.getElementByKey(price);
  }

  delete(price: number): void {
    this.map.eraseElementByKey(price);
  }

  bestBid(): number | undefined {
    const back = this.map.back();
    return back ? back[0] : undefined;
  }

  bestAsk(): number | undefined {
    const front = this.map.front();
    return front ? front[0] : undefined;
  }

  entries(): [number, number][] {
    const result: [number, number][] = [];
    for (const [key, value] of this.map) {
      result.push([key, value]);
    }
    return result;
  }

  get size(): number {
    return this.map.size();
  }

  clear(): void {
    this.map.clear();
  }

  topN(n: number, reverse = false): [number, number][] {
    const result: [number, number][] = [];
    if (reverse) {
      const end = this.map.rEnd();
      let iter = this.map.rBegin();
      for (let i = 0; i < n && !iter.equals(end); i++) {
        const [k, v] = iter.pointer;
        result.push([k, v]);
        iter.next();
      }
    } else {
      const end = this.map.end();
      let iter = this.map.begin();
      for (let i = 0; i < n && !iter.equals(end); i++) {
        const [k, v] = iter.pointer;
        result.push([k, v]);
        iter.next();
      }
    }
    return result;
  }
}
