export interface HeapItem {
  priority: number;
  id: number;
}

/** Binary min-heap over (priority, id) pairs. Used by Dijkstra and A*. */
export class MinHeap {
  private data: HeapItem[] = [];

  get size() {
    return this.data.length;
  }

  push(item: HeapItem): void {
    this.data.push(item);
    this._up(this.data.length - 1);
  }

  pop(): HeapItem | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this._down(0);
    }
    return top;
  }

  private _up(i: number): void {
    while (i > 0) {
      const p = (i - 1) >>> 1;
      if (this.data[p].priority <= this.data[i].priority) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
      i = p;
    }
  }

  private _down(i: number): void {
    const n = this.data.length;
    while (true) {
      let min = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.data[l].priority < this.data[min].priority) min = l;
      if (r < n && this.data[r].priority < this.data[min].priority) min = r;
      if (min === i) break;
      [this.data[min], this.data[i]] = [this.data[i], this.data[min]];
      i = min;
    }
  }
}
