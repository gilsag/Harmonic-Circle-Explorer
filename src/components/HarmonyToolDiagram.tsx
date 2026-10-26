import type { RefObject } from "react";
import { formatChord, type ChordDisplayStyle } from "../display";
import { chordFamilyColor, CIRCLE_OF_FIFTHS, mod12, pitchClassesForChord, pitchName } from "../music";
import type { InterfaceLanguage } from "../i18n/catalog";
import type { ChordIdentity, HarmonicPath } from "../harmonicTools";
import { compareChords } from "../harmonicTools";

type Props={
  kind:"path"|"comparison";
  path?:HarmonicPath;
  first:ChordIdentity;
  second:ChordIdentity;
  language:InterfaceLanguage;
  style:ChordDisplayStyle;
  showEnharmonics:boolean;
  showToneTooltips:boolean;
  colorByFamily:boolean;
  fontSize:number;
  svgRef:RefObject<SVGSVGElement|null>;
  onChordClick:(chord:ChordIdentity,index:number)=>void;
  heading:string;
  sharedLabel:string;
  moveLabel:string;
  noRouteLabel:string;
};
function compact(ch:ChordIdentity,style:ChordDisplayStyle,language:InterfaceLanguage,showEnharmonics:boolean) {
  const sector=Math.max(0,CIRCLE_OF_FIFTHS.indexOf(mod12(ch.rootPc) as typeof CIRCLE_OF_FIFTHS[number]));
  return formatChord(ch.rootPc,ch.familyId,sector,showEnharmonics,style,language);
}
function wrapLabel(label:string,maxChars=16):string[] {
 const lines:string[]=[];
 for(const word of label.split(/\s+/)){
   if(lines.length && `${lines[lines.length-1]} ${word}`.length<=maxChars)
     lines[lines.length-1]+=` ${word}`;
   else if(word.length<=maxChars) lines.push(word);
   else for(let i=0;i<word.length;i+=maxChars)lines.push(word.slice(i,i+maxChars));
 }
 return lines.length?lines:[label];
}
function pitches(ch:ChordIdentity,showEnharmonics:boolean){
 const sector=Math.max(0,CIRCLE_OF_FIFTHS.indexOf(mod12(ch.rootPc) as typeof CIRCLE_OF_FIFTHS[number]));
 return pitchClassesForChord(ch.rootPc,ch.familyId).map(pc=>pitchName(pc,sector,showEnharmonics)).join(" · ");
}
export function HarmonyToolDiagram({kind,path,first,second,language,style,showEnharmonics,showToneTooltips,colorByFamily,fontSize,svgRef,onChordClick,heading,sharedLabel,moveLabel,noRouteLabel}:Props){
  const chords:readonly ChordIdentity[]=kind==="path"?(path?.chords??[]):[first,second];
  const report=compareChords(first,second);
  const active=kind==="comparison"||Boolean(path);
  const width=1040,height=340;
  const textScale=fontSize/18;
  const familyStroke=(ch:ChordIdentity)=>colorByFamily?chordFamilyColor(ch.familyId):"#93a3bd";
  return <svg ref={svgRef} className="harmonic-diagram tool-diagram" xmlns="http://www.w3.org/2000/svg"
    viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={heading}>
    <rect x="0" y="0" width={width} height={height} rx="18" fill="#fff"/>
    <text x="30" y="43" fill="#172033" fontSize={23*textScale} fontWeight="800">{heading}</text>
    {!active && <text x="520" y="180" textAnchor="middle" fill="#657087" fontSize={21*textScale}>{noRouteLabel}</text>}
    {active && kind==="path" && chords.map((ch,i)=>{
      const step=width/(chords.length+0.15);
      const cx=step*(i+0.575),cy=147;
      const label=compact(ch,style,language,showEnharmonics);
      const lines=wrapLabel(label);
      const baseLabelFont=lines.length>=4?11:lines.length===3?12:lines.length===2?14:label.length>13?15:21;
      const longest=Math.max(...lines.map(line=>line.length));
      const labelFont=Math.min(baseLabelFont*textScale,122/Math.max(1,longest*0.65),62/(lines.length*1.2));
      return <g key={`${ch.rootPc}-${ch.familyId}-${i}`}>
        {i>0 && <g>
          <line x1={cx-step+77} y1={cy} x2={cx-77} y2={cy} stroke="#869dbf" strokeWidth="3"/>
          <path d={`M ${cx-85} ${cy-6} L ${cx-77} ${cy} L ${cx-85} ${cy+6}`} stroke="#869dbf" strokeWidth="2" fill="none"/>
          <text x={cx-step/2} y={cy-17} textAnchor="middle" fontSize={13*textScale} fill="#526078">{path?.transitions[i-1]?.totalMotion}</text>
        </g>}
        <g role="button" tabIndex={0} aria-label={label} className="analysis-chord" onClick={()=>onChordClick(ch,i)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onChordClick(ch,i);}}}>
          <rect x={cx-71} y={cy-39} width="142" height="78" rx="12" fill="#f5f8ff" stroke={familyStroke(ch)} strokeWidth="2"/>
          {showToneTooltips && <title>{label} · {pitches(ch,showEnharmonics)}</title>}
          <text x={cx} y={cy-(lines.length-1)*labelFont/2+labelFont*0.34} textAnchor="middle" fill={colorByFamily?chordFamilyColor(ch.familyId):"#182b50"} fontWeight="800" fontSize={labelFont}>
            {lines.map((line,index)=><tspan key={index} x={cx} dy={index===0?0:labelFont*1.18}>{line}</tspan>)}
          </text>
        </g>
        <text x={cx} y={cy+74} textAnchor="middle" fontSize={14*textScale} fill="#556277">{pitches(ch,showEnharmonics).length>24?`${pitches(ch,showEnharmonics).slice(0,23)}…`:pitches(ch,showEnharmonics)}</text>
        <text x={cx} y={cy+102} textAnchor="middle" fontSize={13*textScale} fill="#63718b">{i===0?"●":`${i+1}`}</text>
      </g>;
    })}
    {active && kind==="comparison" && <>
      {([first,second] as const).map((ch,i)=>{
        const cx=i===0?260:780;const label=compact(ch,style,language,showEnharmonics);
        const labelLines=wrapLabel(label,28);
        const largest=Math.max(...labelLines.map(line=>line.length));
        const labelFont=Math.min(24*textScale,340/Math.max(1,largest*0.67),70/(labelLines.length*1.2));
        const pitchText=pitches(ch,showEnharmonics);
        const pitchFont=Math.min(17*textScale,335/Math.max(1,pitchText.length*0.55));
        return <g key={i} role="button" tabIndex={0} className="analysis-chord" aria-label={label}
          onClick={()=>onChordClick(ch,i)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onChordClick(ch,i);}}}>
          <rect x={cx-190} y="95" rx="16" width="380" height="138" fill="#f5f8ff" stroke={familyStroke(ch)} strokeWidth="2"/>
          {showToneTooltips && <title>{label} · {pitches(ch,showEnharmonics)}</title>}
          <text x={cx} y={148-(labelLines.length-1)*labelFont*0.6} fontSize={labelFont} fontWeight="800"
            fill={colorByFamily?chordFamilyColor(ch.familyId):"#17335a"} textAnchor="middle">
            {labelLines.map((line,j)=><tspan key={j} x={cx} dy={j===0?0:labelFont*1.2}>{line}</tspan>)}
          </text>
          <text x={cx} y="204" fontSize={pitchFont} textAnchor="middle" fill="#53627b">{pitchText}</text>
        </g>;
      })}
      <path d="M 458 163 L 582 163 M 571 154 L 582 163 L 571 172" stroke="#637ea9" fill="none" strokeWidth="3"/>
      <rect x="404" y="238" width="232" height="52" rx="12" fill="#eaf1ff"/>
      <text x="520" y="258" textAnchor="middle" fontSize={14*textScale} fontWeight="700" fill="#28476f">{sharedLabel}: {report.sharedPitchClasses.map(pc=>pitchName(pc,0)).join(" · ") || "—"}</text>
      <text x="520" y="280" textAnchor="middle" fontSize={13*textScale} fill="#53627b">{moveLabel}: {report.totalMotion}</text>
    </>}
  </svg>;
}
