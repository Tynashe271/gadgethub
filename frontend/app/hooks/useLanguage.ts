'use client';

import { useEffect, useState } from 'react';
import type { Language } from '../utils/preferences';

const words = {
  sn: {
    shop: 'Tenga', finder: 'Tsvaga Foni', assistant: 'Mubatsiri weAI', feedback: 'Tipe Maonero', compare: 'Enzanisa', services: 'Mabasa', dashboard: 'Dhibhodhi', signIn: 'Pinda', cart: 'Ngoro', logout: 'Buda',
    hero: 'TEKINOLOJI INOFAMBA NEWE.', heroText: 'MaPhone, zvishandiso nemagetsi zvakasarudzwa nemazano akatendeseka, nzira dzakasiyana dzekubhadhara nerutsigiro.', shopNow: 'Tenga izvozvi', findPhone: 'Ndiwanire foni', notSure: 'Hauzive chekutenga?', choosing: 'Uri kusarudza pakati pemidziyo?', ownTech: 'Une mudziyo kare?',
    overview: 'PFUPISO YEAKAUNDI', yourDashboard: 'Dhibhodhi rako', welcome: 'TIKUGAMUCHIRE ZVAKARE', hello: 'Mhoro', manage: 'Ronga kutenga, zvawakachengeta, mabasa nemibairo.', continueShopping: 'Ramba uchitenga', settings: 'Zvirongwa', preferences: 'ZVAUNODA', accountSettings: 'Zvirongwa zveakaunzi', savedAcross: 'Zvaunosarudza zvinochengetwa muakaunzi yako uye zvinoshanda pamidziyo yako yose.', languageAppearance: 'Mutauro nechitarisiko', language: 'Mutauro', languageDesc: 'Sarudza mutauro waunoda kushandisa muGadgetHub.', theme: 'Ruvara', textSize: 'Kukura kwemavara', compact: 'Dhibhodhi diki', motion: 'Deredza kufamba', notifications: 'Zviziviso', orderUpdates: 'Nhau dzeodha nemabasa', offers: 'Zvidzikiso nezvitsva', dataPrivacy: 'Data nekuvanzika', dataSaver: 'Chengetedza data', allSaved: 'Zvese zvachengetwa', saving: 'Zviri kuchengetwa…', loading: 'Zviri kutorwa…'
  },
  nd: {
    shop: 'Thenga', finder: 'Dinga Ifoni', assistant: 'Umsizi weAI', feedback: 'Siphe Umbono', compare: 'Qathanisa', services: 'Imisebenzi', dashboard: 'Ideshibhodi', signIn: 'Ngena', cart: 'Inqola', logout: 'Phuma',
    hero: 'UBUCHWEPHESHE OBUHAMBA LAWE.', heroText: 'Amafoni, amagajethi lezinto zikagesi okukhethwe ngeseluleko esiqotho, indlela zokubhadala eziguqukayo losekelo.', shopNow: 'Thenga manje', findPhone: 'Ngidingele ifoni', notSure: 'Awulasiqiniseko sokuthenga?', choosing: 'Ukhetha phakathi kwamadivayisi?', ownTech: 'Usuvele ulobuchwepheshe?',
    overview: 'ISIFINYEZO SE-AKHAWUNTI', yourDashboard: 'Ideshibhodi yakho', welcome: 'SIYAKWAMUKELA FUTHI', hello: 'Sawubona', manage: 'Phatha ukuthenga, okulondolozileyo, imisebenzi lemivuzo.', continueShopping: 'Qhubeka uthenga', settings: 'Izilungiselelo', preferences: 'OKUTHANDAYO', accountSettings: 'Izilungiselelo ze-akhawunti', savedAcross: 'Okuthandayo kugcinwa ku-akhawunti yakho futhi kulandele wonke amadivayisi.', languageAppearance: 'Ulimi lokubukeka', language: 'Ulimi', languageDesc: 'Khetha ulimi olufunayo kuGadgetHub.', theme: 'Isimo sombala', textSize: 'Ubukhulu bombhalo', compact: 'Ideshibhodi encane', motion: 'Yehlisa ukunyakaza', notifications: 'Izaziso', orderUpdates: 'Izindaba zama-oda lemisebenzi', offers: 'Izaphulelo lokufikayo', dataPrivacy: 'Idatha lemfihlo', dataSaver: 'Gcina idatha', allSaved: 'Konke kugciniwe', saving: 'Kuyagcinwa…', loading: 'Kuyalayishwa…'
  }
} as const;

export type TranslationKey = keyof typeof words.sn;

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => typeof document === 'undefined' ? 'en' : (document.documentElement.lang as Language || 'en'));
  useEffect(() => {
    const change = (event: Event) => setLanguage((event as CustomEvent<Language>).detail);
    window.addEventListener('gh-language-change', change);
    return () => window.removeEventListener('gh-language-change', change);
  }, []);
  const t = (key: TranslationKey, fallback: string) => language === 'en' ? fallback : words[language][key] || fallback;
  return { language, t };
}
