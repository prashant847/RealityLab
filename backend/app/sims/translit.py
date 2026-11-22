"""Hinglish for the offline Hindi voice: Roman-letter Hindi-English text written in Devanagari, the way a Hindi speaker says it.

The Archivist's Hinglish captions are in Roman letters (so anyone can read them). The offline Hindi voice (Piper) reads Devanagari, so this writes each word in it:
Hinglish words from a dictionary of the words the debrief uses, English words from en_deva.json (written once, the way an Indian speaker pronounces them, for the words the
scenarios use) and, for any word in neither, a simple letter-by-letter rule. Numbers are spoken as Hindi words. Used only for the offline voice: with an ElevenLabs key the
Roman text goes straight to a multilingual voice."""
from __future__ import annotations

import json
import re
from pathlib import Path

ONES = ['शून्य', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस', 'बीस', 'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस', 'तीस', 'इकतीस', 'बत्तीस', 'तैंतीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अड़तीस', 'उनतालीस', 'चालीस', 'इकतालीस', 'बयालीस', 'तैंतालीस', 'चौवालीस', 'पैंतालीस', 'छियालीस', 'सैंतालीस', 'अड़तालीस', 'उनचास', 'पचास', 'इक्यावन', 'बावन', 'तिरपन', 'चौवन', 'पचपन', 'छप्पन', 'सत्तावन', 'अट्ठावन', 'उनसठ', 'साठ', 'इकसठ', 'बासठ', 'तिरसठ', 'चौंसठ', 'पैंसठ', 'छियासठ', 'सड़सठ', 'अड़सठ', 'उनहत्तर', 'सत्तर', 'इकहत्तर', 'बहत्तर', 'तिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छिहत्तर', 'सतहत्तर', 'अठहत्तर', 'उन्यासी', 'अस्सी', 'इक्यासी', 'बयासी', 'तिरासी', 'चौरासी', 'पचासी', 'छियासी', 'सत्तासी', 'अट्ठासी', 'नवासी', 'नब्बे', 'इक्यानवे', 'बानवे', 'तिरानवे', 'चौरानवे', 'पंचानवे', 'छियानवे', 'सत्तानवे', 'अट्ठानवे', 'निन्यानवे']


def hn(n: int) -> str:
    n = abs(int(n))
    if n < 100:
        return ONES[n]
    if n < 1000:
        r = n % 100
        return f"{ONES[n // 100]} सौ" + (f" {ONES[r]}" if r else "")
    if n < 100000:
        r = n % 1000
        return f"{hn(n // 1000)} हज़ार" + (f" {hn(r)}" if r else "")
    return " ".join(ONES[int(d)] for d in str(n))


# --- Hinglish words, exactly (the words the Archivist's Hinglish script uses)
HI: dict[str, str] = dict(
    aa="आ", aage="आगे", aaiye="आइए", aane="आने", aap="आप", aapka="आपका", aapke="आपके", aapki="आपकी", aapko="आपको", aapne="आपने", aaram="आराम", aaya="आया", ab="अब",
    accha="अच्छा", achhe="अच्छे", achhi="अच्छी", agar="अगर", agli="अगली", alag="अलग", andaza="अंदाज़ा", apne="अपने", asar="असर", aur="और", baar="बार", baare="बारे",
    baat="बात", baatein="बातें", bachaya="बचाया", badhi="बढ़ी", bahut="बहुत", baith="बैठ", baithiye="बैठिए", bas="बस", batana="बताना", batata="बताता", bataya="बताया",
    behtar="बेहतर", bekaar="बेकार", bhi="भी", bilkul="बिल्कुल", bina="बिना", bolunga="बोलूँगा", chaha="चाहा", chahiye="चाहिए", chahta="चाहता", chaliye="चलिए",
    cheezein="चीज़ें", chhoota="छूटा", chuna="चुना", dauran="दौरान", dekha="देखा", dekhein="देखें", dekhna="देखना", dekhte="देखते", dhoondhe="ढूँढे", dhoondhi="ढूँढी",
    dhyan="ध्यान", dijiye="दीजिए", dikhana="दिखाना", dikhata="दिखाता", dikhaya="दिखाया", dikhega="दिखेगा", dil="दिल", din="दिन", diya="दिया", dobara="दोबारा",
    dono="दोनों", ek="एक", faisla="फ़ैसला", galtiyan="ग़लतियाँ", gaya="गया", gaye="गए", gehri="गहरी", hai="है", hain="हैं", har="हर", hisaab="हिसाब", hoga="होगा",
    hone="होने", hoon="हूँ", hota="होता", hote="होते", hoti="होती", hua="हुआ", hui="हुई", hum="हम", ise="इसे", isi="इसी", isiliye="इसीलिए", isse="इससे", ja="जा",
    jaiye="जाइए", jawab="जवाब", jhooth="झूठ", jinhe="जिन्हें", jinhone="जिन्होंने", jise="जिसे", jismein="जिसमें", jisne="जिसने", jo="जो", ka="का", kaafi="काफ़ी",
    kaam="काम", kabhi="कभी", kahani="कहानी", kahun="कहूँ", kahunga="कहूँगा", kaisa="कैसा", kam="कम", kami="कमी", kar="कर", karke="करके", karne="करने", karta="करता",
    kathin="कठिन", ke="के", kehta="कहता", khatam="ख़त्म", khelein="खेलें", khelne="खेलने", khelte="खेलते", khilaf="ख़िलाफ़", khoye="खोए", khula="खुला", ki="की",
    kisi="किसी", kismat="क़िस्मत", kiya="किया", koi="कोई", kuch="कुछ", kul="कुल", kya="क्या", kyun="क्यों", laga="लगा", lagaya="लगाया", layak="लायक", lekin="लेकिन",
    lijiye="लीजिए", likha="लिखा", likhe="लिखे", liye="लिए", log="लोग", maine="मैंने", mat="मत", mehenge="महँगे", mein="में", mere="मेरे", mila="मिला", milakar="मिलाकर",
    milega="मिलेगा", mili="मिली", mujhe="मुझे", mushkil="मुश्किल", nahi="नहीं", namaste="नमस्ते", ne="ने", nibhaya="निभाया", nuksaan="नुकसान", paas="पास", padha="पढ़ा",
    padhne="पढ़ने", par="पर", pasand="पसंद", pata="पता", pehle="पहले", phir="फिर", poora="पूरा", poori="पूरी", raha="रहा", rahi="रही", rahunga="रहूँगा", rakha="रखा",
    rakhiye="रखिए", saamne="सामने", saans="साँस", saath="साथ", sabse="सबसे", sach="सच", sahi="सही", sakta="सकता", sakte="सकते", sambhala="सँभाला", sawaal="सवाल",
    se="से", seekhne="सीखने", shuruaat="शुरुआत", sirf="सिर्फ़", sochiye="सोचिए", sunna="सुनना", swagat="स्वागत", taiyari="तैयारी", tarah="तरह", tha="था", thi="थी",
    unmein="उनमें", unpar="उन पर", usmein="उसमें", wala="वाला", wale="वाले", wapas="वापस", waqt="वक़्त", woh="वो", ya="या", yaad="याद", yaani="यानी", yahan="यहाँ",
    yahi="यही", yeh="यह", zaroori="ज़रूरी", zyada="ज़्यादा", kaun="कौन", tak="तक", sab="सब", abhi="अभी", jab="जब", tab="तब", kaise="कैसे", kitna="कितना", itna="इतना",
    wahan="वहाँ", kyunki="क्योंकि", magar="मगर", warna="वरना", toh="तो", chalo="चलो", theek="ठीक",
)
# --- words that are Hinglish or English depending on the words around them: (Hinglish, English)
AMBIG = {"to": ("तो", "टू"), "is": ("इस", "इज़"), "the": ("था", "द"), "us": ("उस", "अस"), "main": ("मैं", "मेन"), "he": ("हे", "ही"), "me": ("मे", "मी")}
# --- the commonest English words, as they are said
EN: dict[str, str] = {
    "a": "ए", "an": "एन", "and": "एंड", "in": "इन", "on": "ऑन", "at": "ऐट", "for": "फ़ॉर", "with": "विद", "from": "फ़्रॉम", "by": "बाय", "it": "इट", "its": "इट्स", "you": "यू",
    "your": "योर", "they": "दे", "them": "देम", "their": "देयर", "was": "वॉज़", "were": "वर", "be": "बी", "been": "बीन", "are": "आर", "as": "ऐज़", "that": "दैट", "this": "दिस",
    "not": "नॉट", "but": "बट", "or": "ऑर", "if": "इफ़", "so": "सो", "no": "नो", "can": "कैन", "will": "विल", "would": "वुड", "could": "कुड", "should": "शुड", "have": "हैव",
    "has": "हैज़", "had": "हैड", "do": "डू", "does": "डज़", "did": "डिड", "we": "वी", "she": "शी", "his": "हिज़", "her": "हर", "what": "वॉट", "which": "विच", "when": "वेन",
    "where": "वेयर", "who": "हू", "how": "हाउ", "all": "ऑल", "any": "एनी", "more": "मोर", "most": "मोस्ट", "than": "दैन", "then": "देन", "there": "देयर", "also": "ऑल्सो",
    "only": "ओनली", "into": "इन्टू", "over": "ओवर", "after": "आफ़्टर", "before": "बिफ़ोर", "about": "अबाउट", "because": "बिकॉज़", "between": "बिटवीन", "through": "थ्रू",
    "of": "ऑफ़", "out": "आउट", "up": "अप", "one": "वन", "two": "टू", "three": "थ्री", "four": "फ़ोर", "five": "फ़ाइव", "percent": "परसेंट", "points": "पॉइंट्स", "point": "पॉइंट",
    "decision": "डिसीज़न", "decisions": "डिसीज़न्स", "strong": "स्ट्रॉन्ग", "mixed": "मिक्स्ड", "weak": "वीक", "role": "रोल", "ending": "एंडिंग", "score": "स्कोर", "record": "रिकॉर्ड",
    "records": "रिकॉर्ड्स", "report": "रिपोर्ट", "run": "रन", "sound": "साउंड", "poor": "पूअर", "questionable": "क्वेश्चनेबल", "readiness": "रेडीनेस", "numbers": "नंबर्स",
    "number": "नंबर", "crisis": "क्राइसिस", "normal": "नॉर्मल", "simulation": "सिमुलेशन", "skill": "स्किल", "skills": "स्किल्स", "option": "ऑप्शन", "options": "ऑप्शन्स",
    "take": "टेक", "care": "केयर", "good": "गुड", "fair": "फ़ेयर", "head": "हेड", "start": "स्टार्ट", "plan": "प्लान", "team": "टीम", "result": "रिज़ल्ट", "risk": "रिस्क",
    "hundred": "हंड्रेड", "lots": "लॉट्स", "cargo": "कार्गो", "career": "करियर", "luck": "लक", "set": "सेट", "time": "टाइम", "rate": "रेट", "rating": "रेटिंग",
}

_TOK = re.compile(r"[A-Za-z]+(?:'[a-z]+)?|\d+(?:[.,]\d+)*|\s+|[^A-Za-z\d\s]")

_here = Path(__file__).parent
try:
    EN_DEVA: dict[str, str] = json.loads((_here / "en_deva.json").read_text(encoding="utf-8"))
except (OSError, ValueError):
    EN_DEVA = {}

# --- the letter-by-letter fallback for an English word nobody has written down
_C = {"b": "ब", "c": "क", "d": "ड", "f": "फ़", "g": "ग", "h": "ह", "j": "ज", "k": "क", "l": "ल", "m": "म", "n": "न", "p": "प", "q": "क", "r": "र", "s": "स", "t": "ट",
      "v": "व", "w": "व", "x": "क्स", "z": "ज़", "y": "य"}
_DI = [("tch", "च"), ("chh", "छ"), ("ch", "च"), ("sh", "श"), ("th", "थ"), ("ph", "फ़"), ("ck", "क"), ("kh", "ख"), ("gh", "घ"), ("ng", "ंग"), ("qu", "क्व"), ("wh", "व")]
_V = {"aa": "ा", "ee": "ी", "ea": "ी", "oo": "ू", "ou": "ाउ", "ai": "े", "ay": "े", "oa": "ो", "ow": "ाउ", "a": "ै", "e": "े", "i": "ि", "o": "ॉ", "u": "ु"}
_IV = {"aa": "आ", "ee": "ई", "ea": "ई", "oo": "ऊ", "ou": "आउ", "ai": "ए", "ay": "ए", "oa": "ओ", "ow": "आउ", "a": "अ", "e": "ए", "i": "इ", "o": "ऑ", "u": "अ"}


def _rule(word: str) -> str:
    w = word.lower().replace("'", "")
    if len(w) > 3 and w.endswith("e") and w[-2] not in "aeiou":
        w = w[:-1]                                                       # a silent final e
    out: list[str] = []
    i, after_c = 0, False
    while i < len(w):
        for dg, d in _DI:
            if w.startswith(dg, i):
                if after_c:
                    out.append("्")
                out.append(d)
                i += len(dg)
                after_c = True
                break
        else:
            two, one = w[i:i + 2], w[i]
            if two in _V:
                out.append(_V[two] if after_c else _IV[two])
                i += 2
                after_c = False
            elif one in _V:
                out.append(_V[one] if after_c else _IV[one])
                i += 1
                after_c = False
            else:
                c = _C.get(one, one)
                if one == "c" and i + 1 < len(w) and w[i + 1] in "eiy":
                    c = "स"
                if one == "g" and i + 1 < len(w) and w[i + 1] in "ei":
                    c = "ज"
                if after_c:
                    out.append("्")
                out.append(c)
                i += 1
                after_c = True
    return "".join(out)


def _num(tok: str) -> str:
    parts = re.split(r"[.,]", tok)
    if len(parts) == 2 and "." in tok and len(parts[1]) <= 2:
        return f"{hn(int(parts[0]))} दशमलव {' '.join(ONES[int(d)] for d in parts[1])}"
    return " ".join(hn(int(p)) for p in parts if p)


def to_devanagari(text: str) -> str:
    """The same sentence written for the Hindi voice. Hinglish and English words are both in Devanagari; punctuation stays."""
    toks = _TOK.findall(text)
    words = [t.lower() if t[:1].isalpha() else "" for t in toks]

    def hinglish_near(k: int) -> bool:
        for step in (-1, 1):
            j = k + step
            while 0 <= j < len(toks) and toks[j].isspace():
                j += step
            if 0 <= j < len(toks) and words[j] in HI:
                return True
        return False

    out = []
    for k, t in enumerate(toks):
        w = words[k]
        if not w:
            out.append(_num(t) if t[:1].isdigit() else t)
        elif w in AMBIG:
            out.append(AMBIG[w][0 if hinglish_near(k) else 1])
        elif w in HI:
            out.append(HI[w])
        elif w in EN:
            out.append(EN[w])
        elif w in EN_DEVA:
            out.append(EN_DEVA[w])
        else:
            out.append(_rule(w))
    return "".join(out)
