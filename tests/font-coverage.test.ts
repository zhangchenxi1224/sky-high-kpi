import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join,extname} from 'node:path';
import {createHash} from 'node:crypto';

test('the shipped pixel font covers all source copy, including temptation labels and symbols',()=>{
  const coverage=JSON.parse(readFileSync('public/assets/campus-pixel-coverage.json','utf8'));
  const hash=createHash('sha256').update(readFileSync('public/assets/campus-pixel.woff')).digest('hex');
  assert.equal(hash,coverage.sha256,'Font coverage must match the shipped WOFF');
  const available=new Set<number>(coverage.codepoints),missing=new Set<string>();
  function inspect(dir:string){
    for(const item of readdirSync(dir,{withFileTypes:true})){
      const path=join(dir,item.name);
      if(item.isDirectory()){inspect(path);continue;}
      if(!['.ts','.tsx','.css','.json'].includes(extname(path)))continue;
      for(const char of readFileSync(path,'utf8'))if(!/\s/u.test(char)&&!available.has(char.codePointAt(0)!))missing.add(char);
    }
  }
  inspect('src');
  assert.deepEqual([...missing],[],'Rebuild the pixel font after adding UI copy');
  for(const char of '跳过诱惑开始游戏点击松钩GPA−≤≥✦❄')assert.ok(available.has(char.codePointAt(0)!),char);
});
