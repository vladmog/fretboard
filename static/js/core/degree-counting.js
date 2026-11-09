export const DEGREE_LETTERS=['C','D','E','F','G','A','B'];
export function degreeLetter(root,degree){
    const index=DEGREE_LETTERS.indexOf(root);
    if(index<0||!Number.isInteger(degree)||degree<2||degree>7)throw new RangeError('Use a natural root and degree 2–7');
    return DEGREE_LETTERS[(index+degree-1)%7];
}
export function degreeQuestions(){return DEGREE_LETTERS.flatMap(root=>[2,3,4,5,6,7].map(degree=>({root,degree,answer:degreeLetter(root,degree)})));}
