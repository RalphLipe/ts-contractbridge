import { PBNSection } from './pbnSection.js'

export class PBNGame {
  sections: PBNSection[]

  constructor(sections: PBNSection[] = []) {
    this.sections = sections
  }
}
