"""One line of dialogue per step: who is in the room, and what they say. Shown in the situation pane so each step has a voice.
All people are fictional. Lines are invented for the simulations (nothing here is a quotation of a real person)."""
from __future__ import annotations

VOICES: dict[str, tuple[str, str, str]] = {      # round id -> (name, role, line)
    # ---- hospital: a normal day
    "cw1": ("Sister Anita Das", "Ward nurse lead", "Two of them worried me last night. I could not tell you why. Ask me what I would check first."),
    "cw2": ("Dr. Priya Rao", "First-year resident", "I keep thinking I will say something wrong in front of the patients."),
    "cw3": ("Imran", "Hospital porter", "The oxygen store looks thin to me. Maybe it is always like this? I really do not know."),
    "cw4": ("Mrs. Verma", "A patient's daughter", "Nobody tells me anything. Two days! He is my father."),
    "cw5": ("Mr. Rohan Kapoor", "Hospital administrator", "Ten beds sit empty most days. Help me explain why we keep them."),
    "cw6": ("Sister Anita Das", "Ward nurse lead", "I am fine. Really. I just forgot what a full night's sleep felt like."),
    "cw7": ("Dr. Farid Hakim", "Senior consultant", "If the wards ever fill up, who decides? I would like it written down before I am tired."),
    # ---- hospital: the surge
    "c1": ("Dr. Farid Hakim", "Senior consultant", "Thirty-one in the department. Tell me how you want to decide who is seen first."),
    "c2": ("Mr. Rohan Kapoor", "Hospital administrator", "The wing is closed, not locked. If you can staff it, I can open it."),
    "c3": ("Sister Anita Das", "Ward nurse lead", "Masks are going faster than they arrive. People have started reusing them their own way."),
    "c4": ("The supplier", "On the phone", "I cannot promise the delivery today. Everyone is asking me the same thing."),
    "c5": ("Dr. Priya Rao", "Resident", "Two patients, one bed. I keep going back and forth. I need you to decide with me."),
    "c6": ("Mrs. Verma", "A patient's daughter", "I called six times. Is he alive? Nobody will say."),
    "c7": ("Sister Anita Das", "Ward nurse lead", "I cannot remember when I last ate. Do not look at me like that. I am all right."),
    "c8": ("Dr. Farid Hakim", "Senior consultant", "We got through it. Do not let anyone tell you it was luck."),
    # ---- chemical plant: a normal day
    "bw1": ("Marta Ilves", "Night shift supervisor", "Three open permits. One interlock says under test. I did not get to the bottom of it."),
    "bw2": ("Dev Raman", "Maintenance lead", "That tag? Someone left it last month. The test is overdue, yes. We have been busy."),
    "bw3": ("Lena Okafor", "Operator", "It was only a few drops. I stopped it. Please do not write my name down."),
    "bw4": ("Sam", "Contractor", "Just switch the alarm off till noon. It saves two hours. That is all."),
    "bw5": ("Jonas Berg", "Head office, finance", "Ten percent. Send me what we can cut that will not affect safety."),
    "bw6": ("Mrs. Aydin", "A neighbour", "That siren on the first Monday. What am I supposed to do when it goes?"),
    "bw7": ("Hollis Grant", "Plant director", "New people start Monday. I would rather they learn it in a drill than from a leaflet."),
    # ---- chemical plant: the audit week
    "f1": ("The external auditor", "Safety audit", "The cooling unit has been offline for how long, and who decided?"),
    "f2": ("Jonas Berg", "Head office, finance", "Training and night supervision are the easy cuts. I am just being honest."),
    "f3": ("Lena Okafor", "Operator", "The gauge has been wrong for days and a valve is weeping. I am telling you, not just the log."),
    "f4": ("Mrs. Aydin", "A neighbour", "I know what the siren is for now. Does the rest of the street?"),
    "f5": ("The night operator", "On the radio", "Temperature is up again. It could be the gauge. It could not."),
    "f6": ("The regulator", "Investigation", "What happened, and what did you know before it happened?"),
    # ---- terminal: a normal Monday
    "bow1": ("Operations Manager", "Terminal operations", "Vessel at ten and a queue at the gate. Give me a plan I can say out loud."),
    "bow2": ("IT Lead", "IT systems", "Those servers are overdue for updates. An hour of downtime now saves a nightmare later."),
    "bow3": ("Network Administrator", "Networks", "Quick question: when did we last restore a backup? ...Anyone?"),
    "bow4": ("Customer Representative", "Customer desk", "A hospital supplier asked who they call if the terminal goes dark. I had no answer."),
    "bow5": ("Terminal Supervisor", "Site safety and gate", "If the screens go blank, my gate team has never worked on paper. Let me run a drill."),
    "bow6": ("Network Administrator", "Networks", "The office and yard networks are wired together for convenience. I would like that to change."),
    "bow7": ("Operations Manager", "Terminal operations", "One trucking company moves nearly everything urgent. I do not like that."),
}
