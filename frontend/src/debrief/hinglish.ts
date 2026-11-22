import type { SimReport } from "../api/sims";
import type { Report } from "../api/types";
import { clip, dot, lowerFirst, nameOf, newSeed, plural, scriptForBlackout, scriptForSim, voice, type Scene } from "./script";

/**
 * The Archivist in Hinglish: Hindi and English mixed the way people actually talk, written in Roman letters so the one voice can read it all.
 * The framing sentences are written here in Hinglish; the scenario's own words (what you chose, what it led to) are left in English, as a Hinglish
 * speaker would say them. The scenes, chapters and cards are the English debrief's own; only the spoken lines are replaced, so nothing is left out
 * for want of a translation (which is why this also works for the technical labs).
 */
const num = (n: number): number => Math.abs(Math.round(n * 10) / 10);

function simLines(r: SimReport, say: ReturnType<typeof voice>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const sum = r.summary;
  const good = r.outcome.tone === "good", bad = r.outcome.tone === "bad";
  out.open = [
    say("greet", good
      ? ["Aaiye, baithiye. Aapka record mere saamne khula hai, aur sach kahun to padhne mein kaafi accha laga.", "Aa gaye aap. Baith jaiye. Maine aapke har decision ko dekha hai, aur kuch cheezein sach mein achhi thi."]
      : bad
        ? ["Aaiye, baithiye. Yeh run mushkil tha, main jhooth nahi bolunga. Lekin isse seekhne ko bahut kuch hai, to aaram se dekhte hain.", "Namaste. Baith jaiye, gehri saans lijiye. Kuch baatein sunna mushkil hoga, par isiliye zaroori bhi hai."]
        : ["Aaiye, baith jaiye. Maine aapke har decision ka hisaab rakha hai. Chaliye, saath mein dekhte hain ki kaisa raha.", "Phir se swagat hai. Aaram se baithiye. Aapke choices mein ek kahani hai, aur main use aapke saath batana chahta hoon."]),
    say("role", [`Is baar aap ${r.role} the, aur aapki kahani ${r.outcome.title} par khatam hui.`, `Aapne ${r.role} ka role nibhaya, aur ending rahi: ${r.outcome.title}.`]),
    dot(clip(r.outcome.text, 260)),
    `Kul milakar aapne ${plural(sum.decisions, "decision")} liye: ${sum.strong} strong, ${sum.mixed} mixed aur ${sum.weak} weak. Chaliye, ek-ek karke dekhte hain.`,
  ];
  const hard = (d: SimReport["major_decisions"][number]) => d.rating === "mixed" && !d.stronger_option;
  const effect = (d: SimReport["major_decisions"][number]): string => {
    const top = [...(d.effects ?? [])].sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from)).slice(0, 2);
    return top.length ? `Numbers mein dekhein to ${top.map((e) => `${e.label.toLowerCase()} ${e.from} se ${e.to} ho gaya`).join(", aur ")}.` : "";
  };
  r.major_decisions.filter((d) => d.rating === "strong" || hard(d)).slice(0, 2).forEach((d, i) => {
    out[`good-${i}`] = [
      hard(d)
        ? `Yeh ek mushkil sawaal tha, jismein koi perfect jawab nahi tha. ${d.step} par aapne chuna: ${d.chose}. Jo options saamne the, unmein yeh sabse behtar tha.`
        : say("well", [`Pehle woh baat, jo aapne sahi ki. ${d.step} par aapne chuna: ${d.chose}.`, `Yeh wala mujhe pasand aaya. ${d.step} ke time aapne ${d.chose} choose kiya.`]),
      `${say("followed", ["Iska natija yeh hua.", "Phir aage yeh hua."])} ${dot(clip(d.consequence, 300))}`,
      effect(d),
      !hard(d) && d.lesson ? `Yeh baat yaad rakhiye: ${dot(clip(d.lesson, 200))}` : "",
    ].filter(Boolean);
  });
  const faults = [...r.major_decisions.filter((d) => d.rating === "weak"), ...r.major_decisions.filter((d) => d.rating === "mixed" && !hard(d))].slice(0, 5);
  const improveBy = new Map(r.improve.map((m) => [m.step, m]));
  if (!faults.length) out.clean = ["Maine galtiyan dhoondhi, par ek bhi nahi mili. Har decision strong tha. Bahut accha."];
  else {
    out.turn = [
      faults.length === 1 ? "Ab ek decision hai jise dobara dekhna chahiye." : `Ab ${faults.length} decisions hain jinhe dobara dekhna chahiye.`,
      say("notVerdict", ["Yeh aap par koi faisla nahi hai, bas record yahi dikhata hai.", "Ise dil par mat lijiye. Isi tarah log mushkil kaam mein behtar hote hain."]),
    ];
    faults.forEach((d, i) => {
      const better = d.stronger_option ?? improveBy.get(d.step)?.stronger_option ?? null;
      const why = d.lesson || improveBy.get(d.step)?.why;
      out[`fault-${i}`] = [
        say("faultIntro", [`${d.step}. Aapne chuna ${d.chose}, aur maine ise ${d.rating} rate kiya.`, `Chaliye ${d.step} dekhte hain. Aap ${d.chose} par gaye. Mere hisaab se yeh ${d.rating} tha.`]),
        `${say("happened", ["Hua yeh.", "Iska natija yeh nikla."])} ${dot(clip(d.consequence, 300))}`,
        effect(d),
        why ? dot(clip(why, 220)) : "",
        better ? say("better", [`Ek behtar option yeh tha: ${better}. Agli baar ise pehle sochiye.`, `Main hota to yeh try karta: ${better}. Yeh dhyan mein rakhiye.`]) : "",
      ].filter(Boolean);
    });
  }
  if (r.kind === "workday" && r.prep?.length) {
    const missed = r.prep.filter((p) => p.status === "missed"), set = r.prep.filter((p) => p.status === "full");
    out.prep = [
      "Ek normal din sirf normal nahi hota. Yeh aage aane wale crisis ki taiyari bhi karta hai.",
      missed.length ? `Aapne yeh set up nahi kiya: ${missed.slice(0, 3).map((p) => p.label.toLowerCase()).join(", ")}. Crisis mein is kami ka asar dikhega.` : "Kuch bhi chhoota nahi, to crisis mein aapko poora head start milega.",
      set.length ? `Jo aapne accha kiya: ${set.slice(0, 3).map((p) => p.label.toLowerCase()).join(", ")}.` : "",
    ].filter(Boolean);
  } else if (r.kind === "crisis") {
    const prepared = r.prepared ?? [];
    out.prep = [prepared.length ? `Aap is crisis mein ek head start ke saath gaye, apne normal din se: ${prepared.slice(0, 3).map((p) => p.label.toLowerCase()).join(", ")}. Us taiyari ne kaam kiya.` : "Aap is crisis mein bina kisi head start ke gaye. Pehle normal din khelne se crisis ki shuruaat bilkul alag hoti hai."];
  }
  const weak = [...r.skills].sort((a, b) => a.percent - b.percent).slice(0, 2).filter((s) => s.percent < 100);
  const best = [...r.skills].sort((a, b) => b.percent - a.percent)[0];
  if (r.skills.length) out.skills = [
    best ? `Aapki sabse strong skill ${best.label.toLowerCase()} rahi, ${best.percent} percent par.` : "",
    ...weak.map((s) => `${s.label} ${s.percent} percent par hai, jise main ${s.level.toLowerCase()} kahunga.`),
  ].filter(Boolean);
  out.close = [
    ...r.lessons.slice(0, 2).map((l, i) => `${i === 0 ? "Agar sirf ek baat yaad rakhni ho, to yeh:" : "Aur ek baat:"} ${dot(clip(l, 200))}`),
    r.recommended_next.reason ? dot(clip(r.recommended_next.reason, 220)) : "",
    "Yaad rakhiye, yeh sirf is simulation mein aapke choices ke baare mein hai. Yeh aapke baare mein, ya kisi career ke fit hone ke baare mein, koi faisla nahi hai. Take care, aur kabhi bhi wapas aaiye.",
  ].filter(Boolean);
  return out;
}

export function scriptForSimHinglish(r: SimReport, seed: number = newSeed()): Scene[] {
  const lines = simLines(r, voice(seed));
  return scriptForSim(r, seed).map((s) => (lines[s.id]?.length ? { ...s, lines: lines[s.id] } : s));
}

function blackoutLines(r: Report, say: ReturnType<typeof voice>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const q = r.quality, score = r.overall.score;
  out.open = [
    say("greet", score >= 75
      ? ["Aaiye, baithiye. Aapne yeh attack kaafi achhe se sambhala, aur main aapko dikhana chahta hoon kyun.", "Phir se swagat hai. Aapka performance strong tha, chaliye saath mein dekhte hain."]
      : score >= 50
        ? ["Aaiye, baithiye. Attack ke dauran aapka har choice yahan likha hai, ab hum unpar baat kar sakte hain.", "Namaste. Aaram se baithiye. Maine poora attack dobara padha hai, aur bahut kuch baat karne layak hai."]
        : ["Aaiye, baithiye. Yeh attack bahut kathin tha, aur record bhi yahi kehta hai. Lekin seekhne ko bahut hai, aaram se dekhte hain.", "Namaste. Baith jaiye. Jo chaha tha woh nahi hua, par yahan kuch bhi bekaar nahi gaya. Saath mein dekhte hain."]),
    `Record aapki ending ko kehta hai: ${r.ending.title}. ${r.ending.text ? dot(clip(r.ending.text, 220)) : ""}`.trim(),
    `Aapka readiness score ${Math.round(score)} out of one hundred raha, jise main ${r.overall.band.toLowerCase()} kahunga.`,
    `Aapke ${plural(r.decision_count, "decision")} mein se ${q.sound} sound the, ${q.questionable} questionable aur ${q.poor} poor.`,
  ];
  r.strongest_decisions.slice(0, 2).map((i) => r.decisions[i]).forEach((x, i) => x && (out[`good-${i}`] = [
    `Pehle woh baat jo aapne sahi ki. Decision ${x.index + 1}, ${x.clock}. Aapne chuna: ${x.label}.`,
    dot(clip(x.verdict, 260)),
    `Isse aapki readiness ${num(x.impact.score_delta)} points badhi.`,
  ]));
  const mistakes = r.most_damaging_decisions.map((i) => r.decisions[i]).filter((x): x is NonNullable<typeof x> => !!x).slice(0, 4);
  if (!mistakes.length) out.clean = ["Maine mehenge decisions dhoondhe, par ek bhi nahi mila. Bahut accha."];
  else {
    out.turn = [mistakes.length === 1 ? "Ab woh decision, jisne aapko sabse zyada nuksaan diya." : `Ab woh ${mistakes.length} decisions, jinhone aapko sabse zyada nuksaan diya.`, "Main fair rahunga: us waqt aapko kya pata tha, aur aapke paas kya options the, yeh dono dekhte hain."];
    mistakes.forEach((x, i) => {
      const warn = x.warned_by[0];
      out[`fault-${i}`] = [
        `Decision ${x.index + 1}, ${x.clock}. Aapne chuna ${x.label}, aur maine ise ${x.rating} rate kiya.`,
        dot(clip(x.verdict, 260)),
        warn ? `${nameOf(warn.stakeholder)} ne aapko warn kiya tha. ${dot(clip(warn.why, 200))}` : "",
        x.outcome === "unlucky" ? `Sach kahun to is mein kismat bhi aapke khilaf thi. ${x.bad_luck[0] ? dot(clip(x.bad_luck[0], 180)) : ""}`.trim() : "",
        `Is decision se aapki readiness ${num(x.impact.score_delta)} points kam hui.`,
        x.alternative ? `Aap yeh kar sakte the: ${x.alternative.label}.${x.alternative.differences[0] ? ` ${dot(clip(x.alternative.differences[0], 200))}` : ""}` : "",
      ].filter(Boolean);
    });
  }
  const losses = r.avoidable_losses.slice(0, 2);
  if (losses.length) out.losses = ["Jo nuksaan hua, usmein se kuch bachaya ja sakta tha.", ...losses.map((l) => dot(`Aapne ${l.amount} ${l.unit} khoye, ${lowerFirst(l.event)} ke time`))];
  if (r.reveal.records_overstated_by > 0) out.reveal = ["Ab main aapko woh batata hoon jo khelte waqt aapko kabhi nahi dikhaya gaya.", `Aapke records mein ${r.reveal.recorded_units} lots cargo likha tha. Sach mein sirf ${r.reveal.true_units} the, yaani ${r.reveal.records_overstated_by} lots zyada likhe gaye the.`];
  const focus = r.focus_next.slice(0, 2);
  if (focus.length) out.focus = ["Agar aap dobara khelein, to yahan dhyan dijiye.", ...focus.map((f) => `${f.category}, jo ${Math.round(f.score)} par raha. ${dot(clip(f.advice, 200))}`)];
  out.close = ["Maine jo bhi number bataya, woh aapke choices se calculate hua hai. Kisi machine ne andaza nahi lagaya.", "Poori detail written report mein hai, aur aap kisi bhi decision par wapas ja kar dobara choose kar sakte hain. Take care."];
  return out;
}

export function scriptForBlackoutHinglish(r: Report, seed: number = newSeed()): Scene[] {
  const lines = blackoutLines(r, voice(seed));
  return scriptForBlackout(r, seed).map((s) => (lines[s.id]?.length ? { ...s, lines: lines[s.id] } : s));
}
