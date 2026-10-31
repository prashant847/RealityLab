import type { SimReport } from "../api/sims";
import type { Report, ReportDecision } from "../api/types";
import type { Card, Scene, Tone } from "./script";
import SIMS from "./hi-sims.json";
import BLACKOUT from "./hi-blackout.json";

/**
 * The Archivist in Hindi. The framing sentences are written here; the scenario's own words (what you chose, what it led to) come from the
 * translations in hi-sims.json and hi-blackout.json, keyed by the exact English text the simulation produced. A sentence whose words are not
 * translated is left out rather than read by the Hindi voice in English, and numbers are spelled out in Hindi so the voice never has to guess.
 */
const DICT: Record<string, string> = { ...(SIMS as Record<string, string>), ...(BLACKOUT as Record<string, string>) };
export const hiText = (en: string | null | undefined): string | undefined => (en ? DICT[en] : undefined);

const ONES = ["शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस", "बीस",
  "इक्कीस", "बाईस", "तेईस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताईस", "अट्ठाईस", "उनतीस", "तीस", "इकतीस", "बत्तीस", "तैंतीस", "चौंतीस", "पैंतीस", "छत्तीस", "सैंतीस", "अड़तीस", "उनतालीस", "चालीस",
  "इकतालीस", "बयालीस", "तैंतालीस", "चौवालीस", "पैंतालीस", "छियालीस", "सैंतालीस", "अड़तालीस", "उनचास", "पचास", "इक्यावन", "बावन", "तिरपन", "चौवन", "पचपन", "छप्पन", "सत्तावन", "अट्ठावन", "उनसठ", "साठ",
  "इकसठ", "बासठ", "तिरसठ", "चौंसठ", "पैंसठ", "छियासठ", "सड़सठ", "अड़सठ", "उनहत्तर", "सत्तर", "इकहत्तर", "बहत्तर", "तिहत्तर", "चौहत्तर", "पचहत्तर", "छिहत्तर", "सतहत्तर", "अठहत्तर", "उन्यासी", "अस्सी",
  "इक्यासी", "बयासी", "तिरासी", "चौरासी", "पचासी", "छियासी", "सत्तासी", "अट्ठासी", "नवासी", "नब्बे", "इक्यानवे", "बानवे", "तिरानवे", "चौरानवे", "पंचानवे", "छियानवे", "सत्तानवे", "अट्ठानवे", "निन्यानवे"];
/** A whole number written out in Hindi (up to the thousands), so the voice reads it correctly. */
export function hn(value: number): string {
  const n = Math.round(Math.abs(value));
  if (n < 100) return ONES[n];
  if (n < 1000) { const r = n % 100; return `${ONES[Math.floor(n / 100)]} सौ${r ? ` ${ONES[r]}` : ""}`; }
  if (n < 100000) { const r = n % 1000; return `${hn(Math.floor(n / 1000))} हज़ार${r ? ` ${hn(r)}` : ""}`; }
  return String(n);
}

const NAMES: Record<string, string> = { kavya: "काव्या", arjun: "अर्जुन", nisha: "निशा", raghav: "राघव", isha: "ईशा" };
const RATING: Record<string, string> = { strong: "मज़बूत", mixed: "मिला-जुला", weak: "कमज़ोर", sound: "सही", questionable: "संदिग्ध", poor: "ख़राब" };
const LEVEL: Record<string, string> = { Strong: "यह मज़बूत है।", Solid: "यह ठोस है।", Developing: "अभी इसमें सुधार की गुंजाइश है।" };
const CHIP_TONE: Record<string, Tone> = { strong: "good", mixed: "mid", weak: "bad", sound: "good", questionable: "mid", poor: "bad" };

/** Keeps only sentences that are fully Hindi (no Latin letters), so an untranslated English word is never handed to the Hindi voice. */
const clean = (lines: (string | false | null | undefined | "")[]): string[] => lines.filter((l): l is string => !!l && !/[A-Za-z]/.test(l));
const ok = (...parts: (string | undefined)[]): boolean => parts.every((p) => !!p);

const clock = (en: string): string | undefined => hiText(en);

// -------------------------------------------------------------------------- the three professions
export function scriptForSimHi(r: SimReport): Scene[] {
  const out: Scene[] = [];
  const sum = r.summary;
  const role = hiText(r.role), title = hiText(r.outcome.title), text = hiText(r.outcome.text);
  const decisions = sum.decisions === 1 ? "एक फ़ैसला लिया" : `${hn(sum.decisions)} फ़ैसले लिए`;
  out.push({
    id: "open", chapter: "आपका खाता", mood: r.outcome.tone === "good" ? "warm" : r.outcome.tone === "bad" ? "grave" : "calm",
    lines: clean([
      "भीतर आइए। बैठिए। मैं हर चुनाव का हिसाब रखता हूँ, और आपका खाता मेरे सामने खुला है।",
      ok(role) && `आपने ${role} की भूमिका निभाई।`,
      ok(title) && `आपका अंत था: ${title}।`,
      text,
      `आपने ${decisions}: ${hn(sum.strong)} मज़बूत, ${hn(sum.mixed)} मिले-जुले और ${hn(sum.weak)} कमज़ोर। चलिए, इन्हें एक-एक करके देखते हैं।`,
    ]),
    card: { kicker: "अंत", heading: title ?? r.outcome.title, chips: [{ text: `${hn(sum.strong)} मज़बूत`, tone: "good" }, { text: `${hn(sum.mixed)} मिले-जुले`, tone: "mid" }, { text: `${hn(sum.weak)} कमज़ोर`, tone: "bad" }],
      rows: r.final_meters.filter((m) => m.label !== "Understanding of the record").map((m) => { const good = m.good === "high" ? m.value : 100 - m.value; return { label: hiText(m.label) ?? m.label, value: String(m.value), tone: (good >= 65 ? "good" : good >= 40 ? "mid" : "bad") as Tone }; }) },
  });

  type D = SimReport["major_decisions"][number];
  const rows = (d: D) => (d.effects ?? []).map((e) => ({ label: hiText(e.label) ?? e.label, value: `${e.from} → ${e.to}`, tone: ((e.to - e.from) * (e.good === "high" ? 1 : -1) >= 0 ? "good" : "bad") as Tone }));
  const effectLine = (d: D): string => {
    const top = [...(d.effects ?? [])].sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from)).slice(0, 2).filter((e) => hiText(e.label));
    return top.length ? `इससे ${top.map((e) => `${hiText(e.label)} ${hn(e.from)} से ${hn(e.to)} हो गया`).join(", और ")}।` : "";
  };
  const heading = (d: D): string => hiText(d.step) ?? d.step;

  const hard = (d: D): boolean => d.rating === "mixed" && !d.stronger_option;           // the best on offer in a dilemma: a round with no perfect option
  r.major_decisions.filter((d) => d.rating === "strong" || hard(d)).slice(0, 2).forEach((d, i) => out.push({
    id: `good-${i}`, chapter: hard(d) ? "एक कठिन फ़ैसला" : "जो अच्छा हुआ", mood: "warm",
    lines: clean([hard(d) ? "यह एक कठिन फ़ैसला था, जिसका कोई पूरी तरह सही जवाब नहीं था।" : i === 0 ? "सबसे पहले, वह जो आपने अच्छा किया।" : "यह भी एक सही फ़ैसला था।",
      ok(hiText(d.step), hiText(d.chose)) && `${hiText(d.step)} में आपने चुना: ${hiText(d.chose)}।${hard(d) ? " उपलब्ध विकल्पों में यही सबसे अच्छा था।" : ""}`, hiText(d.consequence), effectLine(d)]),
    card: { kicker: d.part, heading: heading(d), chips: [{ text: hard(d) ? "सबसे अच्छा उपलब्ध" : "मज़बूत", tone: "good" }], rows: rows(d) },
  }));

  const faults = [...r.major_decisions.filter((d) => d.rating === "weak"), ...r.major_decisions.filter((d) => d.rating === "mixed" && !hard(d))].slice(0, 5);
  if (!faults.length) {
    out.push({ id: "clean", chapter: "कोई चूक नहीं", mood: "warm", lines: ["मैंने चूकें ढूँढीं। मुझे एक भी नहीं मिली।", "हर फ़ैसला मज़बूत आँका गया। दूसरे चुनावों के साथ दोबारा खेलिए, तब दिखेगा कि विकल्प कैसे बदलते।"] });
  } else {
    out.push({ id: "turn", chapter: "जहाँ चूक हुई", mood: "grave", lines: [faults.length === 1 ? "अब वह एक फ़ैसला, जिसे मैं आपसे दोबारा देखने को कहूँगा।" : `अब वे ${hn(faults.length)} फ़ैसले, जिन्हें मैं आपसे दोबारा देखने को कहूँगा।`, "इसमें आपको परखा नहीं जा रहा। यह केवल वही है जो रिकॉर्ड में दर्ज है।"] });
    faults.forEach((d, i) => {
      const better = d.stronger_option ?? null;
      out.push({
        id: `fault-${i}`, chapter: heading(d), mood: d.rating === "weak" ? "grave" : "pointed",
        lines: clean([
          ok(hiText(d.step), hiText(d.chose)) && `${hiText(d.step)}। आपने चुना: ${hiText(d.chose)}। मैंने इसे ${RATING[d.rating]} आँका।`,
          hiText(d.consequence), effectLine(d),
          better && hiText(better) && `एक बेहतर विकल्प यह था: ${hiText(better)}। अगली बार पहले उसे तौलिए।`,
        ]),
        card: { kicker: d.part, heading: heading(d), chips: [{ text: RATING[d.rating], tone: CHIP_TONE[d.rating] }, { text: `आपने चुना: ${hiText(d.chose) ?? d.chose}`, tone: "plain" }], rows: rows(d), better: better ? (hiText(better) ?? better) : undefined },
      });
    });
  }

  if (r.kind === "workday" && r.prep?.length) {
    const missed = r.prep.filter((p) => p.status === "missed"), set = r.prep.filter((p) => p.status === "full");
    const labels = (xs: typeof r.prep) => xs!.map((p) => hiText(p.label)).filter((x): x is string => !!x);
    out.push({
      id: "prep", chapter: "संकट की तैयारी", mood: missed.length ? "pointed" : "warm",
      lines: clean([
        `यह साधारण दिन आगे के संकट की नींव भी रखता है। आपने ${hn(set.length)} बातें पूरी तरह तैयार कीं${labels(set).length ? `, जिनमें ${labels(set).slice(0, 2).join(" और ")} शामिल हैं` : ""}।`,
        missed.length ? (labels(missed).length ? `आपने ये तैयार नहीं कीं: ${labels(missed).slice(0, 3).join(", ")}। संकट आने पर आपको इस कमी का एहसास होगा।` : "कुछ बातें अधूरी रह गईं। संकट आने पर आपको इस कमी का एहसास होगा।") : "कुछ भी अधूरा नहीं रहा। आप संकट में हर वह बढ़त लेकर उतरेंगे जो यह दिन दे सकता था।",
      ]),
      card: { kicker: "तैयारी", heading: "इस दिन ने क्या तैयार किया", chips: [], rows: r.prep.map((p) => ({ label: hiText(p.label) ?? p.label, value: p.status === "full" ? "पूरा" : p.status === "part" ? "आधा" : "नहीं हुआ", tone: (p.status === "full" ? "good" : p.status === "part" ? "mid" : "bad") as Tone })) },
    });
  } else if (r.kind === "crisis") {
    const names = (r.prepared ?? []).map((p) => hiText(p.label)).filter((x): x is string => !!x);
    out.push({
      id: "prep", chapter: "आपकी बढ़त", mood: (r.prepared ?? []).length ? "warm" : "pointed",
      lines: clean([(r.prepared ?? []).length
        ? `आप संकट में अपने साधारण दिन की बढ़त लेकर उतरे${names.length ? `: ${names.slice(0, 3).join(", ")}` : ""}। उस तैयारी का फ़ायदा हुआ।`
        : "आप बिना किसी बढ़त के संकट में उतरे। पहले साधारण दिन खेलने से संकट की शुरुआत बदल जाती है। इसे आज़माइए।"]),
    });
  }

  const weak = [...r.skills].sort((a, b) => a.percent - b.percent).slice(0, 2).filter((s) => s.percent < 100);
  const best = [...r.skills].sort((a, b) => b.percent - a.percent)[0];
  if (r.skills.length) {
    const hurt = (s: (typeof r.skills)[number]): string => {
      const worst = [...s.evidence].sort((a, b) => a.points - b.points)[0];
      return worst && worst.points < 0 && ok(hiText(worst.step), hiText(worst.choice)) ? `इसे सबसे ज़्यादा नुक़सान ${hiText(worst.step)} में ${hiText(worst.choice)} वाले चुनाव से हुआ।` : "";
    };
    out.push({
      id: "skills", chapter: "आपकी क्षमताएँ", mood: "calm",
      lines: clean([
        best && hiText(best.label) && `आपकी सबसे मज़बूत क्षमता रही ${hiText(best.label)}, ${hn(best.percent)} प्रतिशत।`,
        ...weak.flatMap((s) => hiText(s.label) ? [`${hiText(s.label)}: ${hn(s.percent)} प्रतिशत। ${LEVEL[s.level] ?? ""}`, hurt(s)] : []),
      ]),
      card: { kicker: "क्षमताएँ", heading: "आपके फ़ैसलों ने क्या दिखाया", chips: [], rows: r.skills.map((s) => ({ label: hiText(s.label) ?? s.label, value: `${s.percent}%`, tone: (s.percent >= 75 ? "good" : s.percent >= 50 ? "mid" : "bad") as Tone })) },
    });
  }

  out.push({
    id: "close", chapter: "इसे साथ ले जाइए", mood: "warm",
    lines: clean([
      ...r.lessons.slice(0, 2).map((l, i) => hiText(l) && `${i === 0 ? "यह बात साथ ले जाइए:" : "और यह भी:"} ${hiText(l)}`),
      hiText(r.recommended_next.reason),
      "यह केवल इस सिमुलेशन में आपके चुनावों का वर्णन है। यह आपकी योग्यता का, या किसी पेशे के आपके लिए उपयुक्त होने का फ़ैसला नहीं है। जाइए, शुभ हो।",
    ]),
  });
  return out;
}

// -------------------------------------------------------------------------- BLACKOUT
const pts = (n: number): number => Math.round(Math.abs(n));

export function scriptForBlackoutHi(r: Report): Scene[] {
  const out: Scene[] = [];
  const q = r.quality;
  const d = (i: number): ReportDecision | undefined => r.decisions[i];
  const name = (id: string): string => NAMES[id] ?? "";
  const endTitle = hiText(r.ending.title), endText = hiText(r.ending.text);
  const band = hiText(`band:${r.overall.band}`);
  const tone = (s: number): Tone => (s >= 75 ? "good" : s >= 50 ? "mid" : "bad");
  out.push({
    id: "open", chapter: "आपका खाता", mood: r.overall.score >= 75 ? "warm" : r.overall.score >= 50 ? "calm" : "grave",
    lines: clean([
      "भीतर आइए। बैठिए। हमले के दौरान आपके हर चुनाव का लेखा यहाँ दर्ज है, और अब मैं उसे आपको पढ़कर सुनाता हूँ।",
      endTitle && `रिकॉर्ड आपके अंत को कहता है: ${endTitle}।`, endText,
      `आपकी तैयारी का अंक सौ में से ${hn(r.overall.score)} रहा${band ? `, जिसे मैं ${band} कहूँगा` : ""}।`,
      `आपके ${hn(r.decision_count)} फ़ैसलों में ${hn(q.sound)} सही थे, ${hn(q.questionable)} संदिग्ध और ${hn(q.poor)} ख़राब।${q.unlucky ? ` ${hn(q.unlucky)} में क़िस्मत ने साथ नहीं दिया, यह ग़लत सोच का नतीजा नहीं था।` : ""}`,
    ]),
    card: { kicker: "अंत", heading: endTitle ?? r.ending.title, chips: [{ text: `अंक ${hn(r.overall.score)}`, tone: tone(r.overall.score) }, ...(band ? [{ text: band, tone: "plain" as Tone }] : [])],
      rows: r.categories.map((c) => ({ label: hiText(c.name) ?? c.name, value: String(Math.round(c.score)), tone: tone(c.score) })) },
  });

  r.strongest_decisions.slice(0, 2).map(d).forEach((x, i) => x && out.push({
    id: `good-${i}`, chapter: "जो अच्छा हुआ", mood: "warm",
    lines: clean([i === 0 ? "सबसे पहले, वह जो आपने अच्छा किया।" : "यह भी एक सही फ़ैसला था।", ok(clock(x.clock), hiText(x.label)) && `फ़ैसला ${hn(x.index + 1)}, ${clock(x.clock)}। आपने चुना: ${hiText(x.label)}।`, pts(x.impact.score_delta) > 0 && `इससे आपकी तैयारी ${hn(pts(x.impact.score_delta))} अंक बढ़ी।`]),
    card: { kicker: `फ़ैसला ${hn(x.index + 1)}`, heading: hiText(x.label) ?? x.label, chips: [{ text: "सही", tone: "good" }], rows: [] },
  }));

  const mistakes = r.most_damaging_decisions.map(d).filter((x): x is ReportDecision => !!x).slice(0, 4);
  if (!mistakes.length) {
    out.push({ id: "clean", chapter: "कोई चूक नहीं", mood: "warm", lines: ["मैंने चूकें ढूँढीं। मुझे ऐसा एक भी फ़ैसला नहीं मिला जिसने आपको नुक़सान पहुँचाया हो।"] });
  } else {
    out.push({ id: "turn", chapter: "जहाँ चूक हुई", mood: "grave", lines: [mistakes.length === 1 ? "अब वह फ़ैसला, जिसने आपको सबसे ज़्यादा नुक़सान पहुँचाया।" : `अब वे ${hn(mistakes.length)} फ़ैसले, जिन्होंने आपको सबसे ज़्यादा नुक़सान पहुँचाया।`, "मैं बताऊँगा कि उस समय आप क्या जानते थे, और आप क्या कर सकते थे।"] });
    mistakes.forEach((x, i) => {
      const warn = x.warned_by[0];
      const alt = x.alternative && hiText(x.alternative.label);
      out.push({
        id: `fault-${i}`, chapter: `फ़ैसला ${hn(x.index + 1)}`, mood: x.rating === "poor" ? "grave" : "pointed",
        lines: clean([
          ok(clock(x.clock), hiText(x.label)) && `फ़ैसला ${hn(x.index + 1)}, ${clock(x.clock)}। आपने चुना: ${hiText(x.label)}। मैंने इसे ${RATING[x.rating]} आँका।`,
          x.outcome === "lucky"
            ? `यह चल गया, पर जोखिम भरा था: केवल ${hn(100 * x.p_objective)} प्रतिशत सम्भावित स्थितियों में लक्ष्य पहुँच में रहता।`
            : `सम्भावित स्थितियों में से केवल ${hn(100 * x.p_objective)} प्रतिशत में लक्ष्य पहुँच में रहता${alt ? `, जबकि ${alt} चुनने पर ${hn(100 * x.p_best)} प्रतिशत में` : ""}।`,
          warn && name(warn.stakeholder) && `${name(warn.stakeholder)} ने आपको पहले ही चेताया था।`,
          x.outcome === "unlucky" && "पर निष्पक्ष होकर कहूँ, तो यहाँ क़िस्मत आपके ख़िलाफ़ थी।",
          pts(x.impact.score_delta) > 0 && `इससे आपकी तैयारी ${hn(pts(x.impact.score_delta))} अंक घटी।`,
          alt && `आप यह कर सकते थे: ${alt}।`,
        ]),
        card: { kicker: `फ़ैसला ${hn(x.index + 1)}`, heading: hiText(x.label) ?? x.label, chips: [{ text: RATING[x.rating], tone: CHIP_TONE[x.rating] }, ...(warn && name(warn.stakeholder) ? [{ text: `${name(warn.stakeholder)} ने चेताया`, tone: "mid" as Tone }] : [])], rows: [], better: x.alternative ? (hiText(x.alternative.label) ?? x.alternative.label) : undefined },
      });
    });
  }

  const phrase = (unit: string, amount: number): string | undefined => hiText(unit)?.replace("{n}", hn(amount));
  const losses = r.avoidable_losses.slice(0, 2).filter((l) => ok(hiText(l.event), phrase(l.unit, l.amount)));
  if (losses.length) out.push({
    id: "losses", chapter: "क्या खोया", mood: "grave",
    lines: clean(["कुछ नुक़सान ऐसा था जिसे टाला जा सकता था।", ...losses.map((l) => `${hiText(l.event)}। नुक़सान: ${phrase(l.unit, l.amount)}।${l.caused_by && hiText(l.caused_by.label) ? ` मैं इसका कारण फ़ैसला ${hn(l.caused_by.index + 1)} को मानता हूँ: ${hiText(l.caused_by.label)}।` : ""}${l.alternative && hiText(l.alternative) ? ` इसके बजाय: ${hiText(l.alternative)}। ऐसा करने से यह टल जाता।` : ""}`)]),
    card: { kicker: "टाले जा सकने वाले नुक़सान", heading: "क्या बचाया जा सकता था", chips: [], rows: losses.map((l) => ({ label: hiText(l.event) ?? l.event, value: `−${l.amount}`, tone: "bad" as Tone })) },
  });

  if (r.reveal.records_overstated_by > 0) out.push({
    id: "reveal", chapter: "जो आप जान नहीं सकते थे", mood: "grave",
    lines: ["अब मैं आपको वह बताता हूँ जो खेलते समय आपको कभी नहीं दिखाया गया।", `आपके रिकॉर्ड में ${hn(r.reveal.recorded_units)} खेप दर्ज थीं। असल में ${hn(r.reveal.true_units)} ही थीं। रिकॉर्ड ${hn(r.reveal.records_overstated_by)} बढ़ा-चढ़ाकर लिखे गए थे, और केवल ${hn(r.reveal.verified_units)} की पुष्टि हुई थी।`, "भरोसा करने से पहले जाँच लेना, सबसे पुराना सबक़ है।"],
    card: { kicker: "रहस्य खुला", heading: "रिकॉर्ड ग़लत थे", chips: [], rows: [{ label: "दर्ज", value: String(r.reveal.recorded_units), tone: "plain" }, { label: "असल में", value: String(r.reveal.true_units), tone: "plain" }, { label: "पुष्टि हुई", value: String(r.reveal.verified_units), tone: "good" }] },
  });

  const focus = r.focus_next.slice(0, 2).filter((f) => ok(hiText(f.category), hiText(f.advice)));
  if (focus.length) out.push({
    id: "focus", chapter: "क्या सुधारें", mood: "pointed",
    lines: clean(["अगर आप दोबारा खेलें, तो ध्यान यहाँ दीजिए।", ...focus.map((f) => `${hiText(f.category)}, जिसका अंक ${hn(f.score)} रहा। ${hiText(f.advice)}`)]),
    card: { kicker: "आगे का ध्यान", heading: "कहाँ सुधार करें", chips: [], rows: focus.map((f) => ({ label: hiText(f.category) ?? f.category, value: String(Math.round(f.score)), tone: (f.score >= 50 ? "mid" : "bad") as Tone })) },
  });

  out.push({ id: "close", chapter: "इसे साथ ले जाइए", mood: "warm", lines: ["मैंने आपको जो भी अंक पढ़कर सुनाया, वह आपके किए से ही गिना गया है। किसी मशीन ने अंदाज़ा नहीं लगाया।", "लिखित रिपोर्ट में हर ब्योरा है, और आप किसी भी फ़ैसले पर लौटकर दोबारा चुन सकते हैं। जाइए, शुभ हो।"] });
  return out;
}

export type { Card };
