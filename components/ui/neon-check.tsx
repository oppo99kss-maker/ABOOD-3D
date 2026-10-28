import type { CSSProperties } from "react";
/** Visual treatment adapted from Uiverse.io by 00Kubi; the parent control owns state and keyboard behavior. */
export function NeonCheck({checked}:{checked:boolean}) {
 return <span className="spoo-neon-check" data-checked={checked} aria-hidden="true"><span className="spoo-neon-glow"/><span className="spoo-neon-box"><svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></svg></span><span className="spoo-neon-ring"/>{Array.from({length:6},(_,i)=><i key={i} className="spoo-neon-spark" style={{"--angle":`${i*60}deg`} as CSSProperties}/>)}</span>;
}
