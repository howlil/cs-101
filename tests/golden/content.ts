import { curriculumItemFingerprint } from '../../src/domain/curriculum-v2/schema';

export const GOLDEN_UNIT_ID = 'JAV-009';
export const JAVA_OBJECT = 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html';
export const JAVA_HASHSET = 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashSet.html';
export const JAVA_RECORD = 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Record.html';

const unitDraft = {
  id: GOLDEN_UNIT_ID, kind: 'unit' as const,
  trackId: 'java', moduleId: 'java-oop', order: 1,
  title: 'Equality, hashCode dan deteksi pembayaran duplikat',
  prerequisites: [],
  scope: ['Identity vs value equality', 'equals/hashCode contract', 'HashSet deduplication and input guards'],
  criteria: [
    {id:'c-identity',text:'Menjelaskan perbedaan == dengan equals untuk objek terpisah yang bernilai sama'},
    {id:'c-hash',text:'Membuktikan objek setara mempunyai hashCode sama dan menghindari asumsi hash unik'},
    {id:'c-dedupe',text:'Menggunakan HashSet.add untuk mendeteksi replay dan membedakan merchant'},
    {id:'c-guard',text:'Menolak identifier kosong tanpa menghapus leading zero'},
  ],
  challenge:{
    title:'Duplicate Payment Checker',
    steps:['Buat PaymentKey berisi reference dan merchantId', 'Validasi input kosong dan pertahankan leading zero','Tulis pemeriksaan replay berbasis HashSet','Jalankan kasus same-payment, different merchant, invalid identifier'],
    raw:'Bangun pengecek pembayaran duplikat dengan immutable key dan HashSet; replay ditolak, merchant berbeda tetap diterima, ID kosong ditolak.',
  },
  marketExpectation:['Explain Java equality contracts','Protect idempotent-style duplicate checks from equality bugs'],
  source:{title:'Java 21 Object contract',url:JAVA_OBJECT},
  crossModuleReferenceRaw:[],
};
export const goldenUnit = {...unitDraft,fingerprint:curriculumItemFingerprint(unitDraft)};

const projectDraft = {
  id:'JAV-P01',kind:'checkpoint' as const,trackId:'java',moduleId:'java-oop',order:2,
  title:'Payment Replay Safety Lab',prerequisites:[],
  problemStatement:'Mencegah pembayaran yang sama diproses lebih dari sekali pada demo memory-local, dengan batas merchant eksplisit dan input terjaga.',
  requirements:[
    {id:'r-detect',text:'Satu payment key mewakili satu pasangan reference + merchantId dan replay terdeteksi'},
    {id:'r-validate',text:'Reference kosong ditolak, leading zero dipertahankan, merchant berbeda tetap independen'},
  ],
  source:{title:'Java HashSet add contract',url:JAVA_HASHSET},
};
export const goldenProject = {...projectDraft,fingerprint:curriculumItemFingerprint(projectDraft)};

export const goldenManifest={
  version:2 as const,
  tracks:[{id:'java',title:'Java Engineering',order:1}],
  modules:[{id:'java-oop',trackId:'java',title:'Object Equality and Domain Modeling',order:1}],
  items:[goldenUnit,goldenProject],
  relations:[{from:GOLDEN_UNIT_ID,to:'JAV-P01',type:'contributes_to' as const}],
};

export const goldenSources = {
  itemId:GOLDEN_UNIT_ID, curriculumFingerprint:goldenUnit.fingerprint,
  sources:[
    {title:'Java SE 21 Object contract',url:JAVA_OBJECT,tier:0,supports:['Identity vs value equality','equals/hashCode contract'],notes:['JDK 21, equals and hashCode method detail']},
    {title:'Java SE 21 HashSet contract',url:JAVA_HASHSET,tier:0,supports:['HashSet deduplication and input guards'],notes:['add returns false for an equal member']},
    {title:'Java SE 21 Record contract',url:JAVA_RECORD,tier:0,supports:['Immutable value objects and generated equality'],notes:['record-derived equals and hashCode']},
  ],
  unsupportedClaims:[],
  claims:[
    {id:'reference-identity',statement:'Default Object.equals compares reference identity when not overridden.',conceptIds:['reference-equality'],sourceUrl:JAVA_OBJECT,locator:'Object.equals(Object) / Implementation Requirements',rationale:'The JDK API explicitly describes identity semantics of the base Object equality method.'},
    {id:'hash-equality',statement:'Objects equal according to equals must return matching hash codes.',conceptIds:['hash-contract'],sourceUrl:JAVA_OBJECT,locator:'Object.hashCode() / General contract',rationale:'The JDK contract requires hash consistency for objects that are equal.'},
    {id:'set-duplicate',statement:'HashSet.add returns false if a corresponding equal element is already in the set.',conceptIds:['set-deduplication'],sourceUrl:JAVA_HASHSET,locator:'HashSet.add(E e) / Returns',rationale:'The add contract specifies the boolean outcome for duplicate and new elements.'},
  ],
};

const segmentOne = {
  id:'identity-versus-value',
  objective:'Membedakan identitas referensi dan kesetaraan nilai',
  whyItMatters:'Payment replay datang sebagai objek baru meski reference dan merchantId identik; operator == tidak cukup untuk mengenalinya.',
  firstAction:'Prediksi first == replay untuk dua objek PaymentKey yang dibuat terpisah.',
  mentalModel:'Referensi adalah alamat objek; kesetaraan nilai adalah kontrak tentang isi domain.',
  explanation:'Dua instansi dapat memiliki data yang sama namun berbeda referensi. Kelas yang tidak override equals mewarisi kesetaraan berbasis identitas Object. Record Java menghasilkan equals berdasarkan komponen record.',
  prerequisiteConceptIds:[],
  workedExample:{
    problem:'Sistem menerima ulang reference 00041 milik store-a pada request baru.',
    steps:[
      {action:'Buat dua PaymentKey terpisah dari pasangan nilai yang sama.',reason:'Replay berupa instance baru, bukan referensi lama.',expectedResult:'first == replay bernilai false.'},
      {action:'Bandingkan first.equals(replay).',reason:'Record memeriksa kesetaraan nilai komponen, bukan alamat.',expectedResult:'first.equals(replay) bernilai true.'},
    ],
  },
  guidedPractice:{
    prompt:'Apa nilai first == replay dan first.equals(replay)? Prediksi tanpa menjalankan program.',
    hints:['Bandingkan objek atau nilainya?','Konstruktor dipanggil dua kali, tapi field keduanya sama.'],
    explanation:'Dua new expression membuat referensi berbeda; record membandingkan isi komponen dan menyatakan value object setara.',
  },
  misconceptionRepair:{
    likelyMistake:'Mengira == membandingkan semua field dari objek Java.',
    whyItFails:'Untuk referensi objek, == membandingkan identitas, bukan nilai; Object.equals juga identity-based jika tidak di-override.',
    correctiveAction:'Bandingkan equals pada value object dan jelaskan kontrak kelas yang dipakai.',
  },
  selfCheck:{
    expectedObservation:'same-object=false dan equal-value=true pada contoh Java.',
    ifUnexpected:'Periksa apakah objek dibuat dua kali dan apakah PaymentKey masih berbentuk record yang menghasilkan equals.',
  },
  independentChallenge:{
    prompt:'Buat dua key dengan reference sama tetapi merchantId berbeda. Prediksi equals, lalu buktikan di Java.',
    variationFromExample:'Merchant berubah, bukan objek dengan pasangan komponen identik.',
    criterionIds:['c-identity'],
    expectedEvidence:['Hasil equality berbeda untuk merchantId berbeda dan alasan mengapa diperoleh.'],
  },
  continueFromHere:{
    nextAction:'Uji apakah hashCode dari dua object yang setara juga setara.',
    resumeCue:'Kembali ke prediksi == vs equals untuk dua PaymentKey baru sebelum membaca bagian hash.',
  },
};

const segmentTwo={
  id:'hash-contract',
  objective:'Menjelaskan hubungan equals dan hashCode tanpa menganggap hash selalu unik',
  whyItMatters:'HashSet mengelompokkan objek berdasarkan hash lalu menggunakan kesetaraan; implementasi kontrak yang tidak konsisten bisa membuat replay lolos.',
  firstAction:'Prediksi apakah dua objek dengan equals=true wajib memiliki hashCode sama.',
  mentalModel:'Hash code mempersempit pencarian; equals yang memutuskan kesetaraan.',
  explanation:'Kontrak Object menuntut hash yang sama untuk nilai setara; hash yang sama untuk nilai berbeda tetap diperbolehkan. Perubahan field yang dipakai equals saat menjadi anggota HashSet harus dihindari.',
  prerequisiteConceptIds:['reference-equality'],
  workedExample:{
    problem:'PaymentKey record store-a/00041 dikonstruksi dua kali.',
    steps:[
      {action:'Bandingkan hashCode kedua PaymentKey.',reason:'Dua record setara memiliki komponen setara.',expectedResult:'equal-hash=true.'},
      {action:'Buat key store-b/00041.',reason:'Merchant adalah komponen equality, bukan metadata opsional.',expectedResult:'Key store-b tidak setara dengan key store-a.'},
    ],
  },
  guidedPractice:{
    prompt:'Apakah hashCode sama membuktikan equals=true? Jelaskan dan prediksi singkat.',
    hints:['Kontrak hash hanya berlaku satu arah.','equals=true mengimplikasikan hash sama, bukan sebaliknya.'],
    explanation:'Collision memungkinkan dua objek yang tidak setara menghasilkan hash sama; koleksi hash tetap harus memeriksa equality.',
  },
  misconceptionRepair:{
    likelyMistake:'Menganggap hash yang berbeda atau sama merupakan ID unik yang cukup.',
    whyItFails:'Hash dapat collision dan bukan pengganti identitas bisnis.',
    correctiveAction:'Pakai equality yang mencerminkan field bisnis lalu jaga kontrak hashCode tetap konsisten.',
  },
  selfCheck:{
    expectedObservation:'equal-hash=true untuk key yang equal-value=true.',
    ifUnexpected:'Pastikan semua field yang dipakai equals berkontribusi konsisten pada hashCode; record tidak perlu override manual untuk kasus ini.',
  },
  independentChallenge:{
    prompt:'Buat kelas non-record dengan equals yang benar tetapi hashCode salah; jelaskan potensi hasil HashSet dan perbaiki.',
    variationFromExample:'Gunakan class biasa dengan override eksplisit, bukan record yang menghasilkan method otomatis.',
    criterionIds:['c-hash'],
    expectedEvidence:['Kontrak equals/hashCode konsisten setelah perbaikan dan dapat dijelaskan mengapa.'],
  },
  continueFromHere:{
    nextAction:'Gunakan HashSet.add untuk menguji replay dan merchant berbeda.',
    resumeCue:'Mulai kembali dari implikasi equals=true → hashCode sama, lalu tes pada Set.',
  },
};

const segmentThree={
  id:'set-and-boundaries',
  objective:'Mendeteksi replay dengan HashSet dan menjaga batas input',
  whyItMatters:'Menerima replay sebagai pembayaran baru menghasilkan duplikasi; salah normalisasi leading zero menggabungkan reference yang sebenarnya berbeda.',
  firstAction:'Prediksi hasil seen.add(replay) setelah seen.add(first) mengembalikan true.',
  mentalModel:'Set menerima anggota baru, tetapi menolak anggota yang setara dengan anggota lama.',
  explanation:'HashSet.add mengembalikan false bila anggota setara sudah tersimpan. Kunci immutable record menyertakan merchantId dan reference String sehingga leading zero tidak hilang. Validasi input dilakukan sebelum memasukkan key.',
  prerequisiteConceptIds:['reference-equality','hash-contract'],
  workedExample:{
    problem:'Mendeteksi replay reference 00041 pada store-a tanpa mengganggu store-b.',
    steps:[
      {action:'Tambahkan first ke HashSet.',reason:'Belum ada elemen setara.',expectedResult:'first-accepted=true.'},
      {action:'Tambahkan replay dengan data store-a yang sama.',reason:'Record equality dan hashCode identik dengan elemen yang tersimpan.',expectedResult:'replay-accepted=false.'},
      {action:'Tambahkan reference yang sama tetapi merchant store-b.',reason:'Kunci bisnis memuat merchantId.',expectedResult:'other-merchant-accepted=true dan unique-payments=2.'},
      {action:'Coba konstruksi key dengan reference kosong.',reason:'Boundary constructor menolak ID kosong.',expectedResult:'invalid-rejected=true.'},
    ],
  },
  guidedPractice:{
    prompt:'Untuk first, replay, dan otherMerchant, tulis urutan tiga boolean hasil add sebelum menjalankan.',
    hints:['Set baru kosong saat first masuk.','Key store-b tidak setara meski reference-nya sama.'],
    explanation:'Urutannya true, false, true. Kunci tetap string, sehingga 00041 dan 41 tidak dilebur.',
  },
  misconceptionRepair:{
    likelyMistake:'Mengubah reference menjadi angka atau hanya memakai reference sebagai key.',
    whyItFails:'Leading zero hilang saat diubah menjadi angka, dan reference dari merchant berbeda menjadi collision bisnis.',
    correctiveAction:'Simpan reference sebagai String, masukkan merchantId ke value object, dan tolak field kosong.',
  },
  selfCheck:{
    expectedObservation:'first-accepted=true, replay-accepted=false, other-merchant-accepted=true, unique-payments=2 dan invalid-rejected=true.',
    ifUnexpected:'Periksa apakah merchantId menjadi komponen record dan input kosong diperiksa sebelum add.',
  },
  independentChallenge:{
    prompt:'Implementasikan PaymentKey dengan variasi reference 00041 vs 41, beda merchant, dan string kosong; tulis pemeriksaan yang gagal bila perilaku berubah.',
    variationFromExample:'Tambahkan kasus leading-zero yang berbeda dan jalur input kosong, tidak hanya replay identik.',
    criterionIds:['c-dedupe','c-guard','challenge'],
    expectedEvidence:['Dua reference 00041 dan 41 diperlakukan berbeda.','Replay sama ditolak tanpa menolak merchant berbeda.','ID kosong menimbulkan IllegalArgumentException sebelum disimpan.'],
  },
  continueFromHere:{
    nextAction:'Uji class immutable sendiri dan hubungkan dengan checkpoint Payment Replay Safety Lab.',
    resumeCue:'Setelah jeda, prediksi tiga hasil add pada fixture sebelum melihat output; lanjutkan dari satu kasus gagal.',
  },
};

export const goldenSpec = {
  itemId:GOLDEN_UNIT_ID,
  curriculumFingerprint:goldenUnit.fingerprint,
  payoff:'Cegah replay pembayaran saat instance request berbeda tapi identitas bisnis sama.',
  learningOutcomes:goldenUnit.criteria.map((criterion)=>criterion.text),
  mentalModel:'Referensi (==) != nilai domain (equals); hashCode mendukung index, sedangkan equals menentukan anggota yang sama.',
  relationshipGraph:'PaymentKey -> equals/hashCode -> HashSet.add -> accept / duplicate',
  concepts:[
    {id:'reference-equality',title:'Reference and value equality',mechanism:'Reference identity differs from structural value equality.',sourceUrls:[JAVA_OBJECT,JAVA_RECORD]},
    {id:'hash-contract',title:'Hash consistency',mechanism:'Equal objects must have equal hash codes; collisions do not establish equality.',sourceUrls:[JAVA_OBJECT]},
    {id:'set-deduplication',title:'HashSet duplicate detection',mechanism:'Set.add is false for equal existing member; stable keys include merchant and reference.',sourceUrls:[JAVA_HASHSET]},
  ],
  misconceptions:['== compares all fields','Equal hash proves equal values','Payment references can safely be parsed as integers'],
  practice:['Predict equality before running code','Predict three HashSet.add results','Change merchant and leading zeros and check outcomes'],
  coverage:[
    {criterionId:'c-identity',taughtAt:'identity-versus-value',assessedAt:'guided practice + independent challenge',evidenceExpected:'Predict same-object=false and equal-value=true'},
    {criterionId:'c-hash',taughtAt:'hash-contract',assessedAt:'independent class override challenge',evidenceExpected:'Describe equals/hashCode implication without assuming hash uniqueness'},
    {criterionId:'c-dedupe',taughtAt:'set-and-boundaries',assessedAt:'HashSet implementation',evidenceExpected:'Boolean add outputs true/false/true'},
    {criterionId:'c-guard',taughtAt:'set-and-boundaries',assessedAt:'invalid key challenge',evidenceExpected:'Leading zero preserved, blank input rejected'},
    {criterionId:'challenge',taughtAt:'set-and-boundaries',assessedAt:'Duplicate Payment Checker',evidenceExpected:'Verified replay, merchant isolation and invalid-input tests'},
  ],
  pedagogy:{
    version:3 as const,
    segments:[segmentOne,segmentTwo,segmentThree],
    projectBridge:{
      checkpointId:'JAV-P01',requirementIds:['r-detect','r-validate'],
      contribution:'Deterministic equality for immutable payment keys prevents duplicate replay events in payment-lab.',
      verification:['Replay same key is rejected','Merchant-isolated keys are distinct','Blank reference is rejected'],
    },
  },
  reviewQuestions:[
    {id:'q1',prompt:'Dua PaymentKey record baru memuat reference dan merchant yang sama. Apa hasil first == replay?',options:['true','false','Tidak bisa dikompilasi'],answer:1,explanation:'== membandingkan dua referensi objek yang dibuat secara terpisah.',criterionIds:['c-identity'],whenIncorrect:'Periksa apakah new/record constructor dipanggil dua kali.',nextAction:'Coba first.equals(replay).'},
    {id:'q2',prompt:'Jika a.equals(b) true, mana yang wajib?',options:['a.hashCode() == b.hashCode()','a == b','hash selalu unik untuk semua objek'],answer:0,explanation:'Kontrak Object mengharuskan objek setara menghasilkan hash sama.',criterionIds:['c-hash'],whenIncorrect:'Tinjau arah implikasi equals=true -> hash sama.',nextAction:'Uji dua record dengan komponen sama.'},
    {id:'q3',prompt:'Apa hasil HashSet.add(replay) setelah anggota setara sudah dimasukkan?',options:['true','false','Exception'],answer:1,explanation:'Set tidak menambah elemen kedua yang setara; add mengembalikan false.',criterionIds:['c-dedupe'],whenIncorrect:'Ingat return false berarti set tidak berubah.',nextAction:'Tambahkan key dengan merchantId berbeda.'},
    {id:'q4',prompt:'Apa masalah mengubah reference "00041" menjadi angka?',options:['Tidak ada dampak','Leading zero hilang dan identitas domain bisa berubah','HashSet tidak bisa menyimpan String'],answer:1,explanation:'ID bukan kuantitas; parsing integer menghilangkan format dan dapat menggabungkan key yang berbeda.',criterionIds:['c-guard'],whenIncorrect:'Bandingkan string "00041" dan "41" sebelum parsing.',nextAction:'Tambahkan test untuk input ID kosong.'},
    {id:'q5',prompt:'Pasangan reference 00041 dari store-a dan store-b harus...',options:['Selalu dianggap sama','Dianggap berbeda karena merchantId bagian key','Dihapus seluruhnya'],answer:1,explanation:'Nilai key harus mencakup identitas merchant dan reference untuk isolasi.',criterionIds:['c-dedupe','c-guard'],whenIncorrect:'Periksa definisi dua komponen record PaymentKey.',nextAction:'Uji replay dari store-a setelah store-b ditambahkan.'},
  ],
};

export const expectedJavaStdout = [
  'same-object=false',
  'equal-value=true',
  'equal-hash=true',
  'first-accepted=true',
  'replay-accepted=false',
  'other-merchant-accepted=true',
  'unique-payments=2',
  'invalid-rejected=true',
  '',
].join('\n');

export const goldenExecutablePlan = {
  version:1 as const,
  itemId:GOLDEN_UNIT_ID,
  curriculumFingerprint:goldenUnit.fingerprint,
  examples:[{id:'duplicate-payment-checker',runtime:'java' as const,file:'DuplicatePaymentChecker.java',expectedStdout:expectedJavaStdout}],
};
