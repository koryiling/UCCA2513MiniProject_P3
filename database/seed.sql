-- UTAR Admission Assistant - chatbot data (English / Chinese / Malay)
-- Run after schema.sql. Safe to run again: it clears and reloads the chatbot tables only
-- (users and chat_logs are kept).
--
-- Facts come from UTAR's official admission website (checked 2 November 2026):
--   https://admission.utar.edu.my/Entry-Qualifications-and-English-Language-Requirements.php
--   https://admission.utar.edu.my/Apply_Now.php
--   https://admission.utar.edu.my/intake-and-Academic-Calendar.php
--   https://admission.utar.edu.my/Acceptance-and-Registration.php
--
-- To add a new question type: add a row to chat_intents, then its keywords and its 3 responses.
-- Tip: inside SQL strings, write an apostrophe as two apostrophes (Bachelor''s).

USE utar_admission;

SET NAMES utf8mb4;

DELETE FROM chat_keywords;
DELETE FROM chat_responses;
DELETE FROM chat_intents;

-- ---------------------------------------------------------------------------
-- Intents (types of question)
-- ---------------------------------------------------------------------------
INSERT INTO chat_intents (intent_id, intent_code, description, priority) VALUES
  (1,  'greeting',            'Hello / hi',                                        1),
  (2,  'entry_requirements',  'Accepted qualifications and general requirements', 5),
  (3,  'english_requirement', 'English-language requirement, EEP and IEP',         8),
  (4,  'apply_steps',         'How to apply (application steps)',                 5),
  (5,  'application_result',  'When the application result is released',          7),
  (6,  'documents',           'Documents to prepare',                              6),
  (7,  'intake_dates',        'Intake dates and deadlines',                        6),
  (8,  'mbbs_nursing',        'Medicine (MBBS) and Nursing',                       9),
  (9,  'international',       'International students',                            8),
  (10, 'credit_transfer',     'Credit transfer',                                   9),
  (11, 'acceptance',          'Accepting the offer, payment and student ID',       7),
  (12, 'alternative_pathway', 'Options when a requirement is not met',             7),
  (13, 'fees',                'Tuition fees',                                      8),
  (14, 'scholarship',         'Scholarships and financial aid',                    6),
  (15, 'student_life',        'Campuses, faculties, facilities, accommodation',    5),
  (16, 'fallback',            'Used when no keyword matches',                      0);

-- ---------------------------------------------------------------------------
-- Keywords
-- Short English words (3 letters or fewer, e.g. "hi", "ic") must match a whole word.
-- Everything else matches anywhere in the message, so "eligib" matches "eligible" and "eligibility".
-- ---------------------------------------------------------------------------
INSERT INTO chat_keywords (intent_id, lang, keyword) VALUES
  -- 1 greeting
  (1, 'en', 'hi'), (1, 'en', 'hello'), (1, 'en', 'hey'), (1, 'en', 'good morning'),
  (1, 'zh', '你好'), (1, 'zh', '您好'), (1, 'zh', '哈喽'), (1, 'zh', '嗨'),
  (1, 'ms', 'hai'), (1, 'ms', 'helo'), (1, 'ms', 'selamat pagi'), (1, 'ms', 'apa khabar'),

  -- 2 entry_requirements
  (2, 'en', 'requirement'), (2, 'en', 'entry'), (2, 'en', 'qualif'), (2, 'en', 'eligib'),
  (2, 'en', 'spm'), (2, 'en', 'stpm'), (2, 'en', 'uec'), (2, 'en', 'a-level'), (2, 'en', 'igcse'), (2, 'en', 'grade'),
  (2, 'zh', '要求'), (2, 'zh', '资格'), (2, 'zh', '入学'), (2, 'zh', '成绩'), (2, 'zh', '条件'), (2, 'zh', '统考'),
  (2, 'ms', 'syarat'), (2, 'ms', 'kelayakan'), (2, 'ms', 'kemasukan'), (2, 'ms', 'layak'), (2, 'ms', 'gred'),

  -- 3 english_requirement
  (3, 'en', 'english'), (3, 'en', 'muet'), (3, 'en', 'ielts'), (3, 'en', 'toefl'), (3, 'en', 'eep'), (3, 'en', 'iep'), (3, 'en', 'cefr'),
  (3, 'zh', '英文'), (3, 'zh', '英语'),
  (3, 'ms', 'bahasa inggeris'), (3, 'ms', 'inggeris'),

  -- 4 apply_steps
  (4, 'en', 'apply'), (4, 'en', 'application'), (4, 'en', 'procedure'), (4, 'en', 'step'), (4, 'en', 'how to'), (4, 'en', 'how do i'),
  (4, 'zh', '申请'), (4, 'zh', '报名'), (4, 'zh', '步骤'), (4, 'zh', '程序'),
  (4, 'ms', 'mohon'), (4, 'ms', 'permohonan'), (4, 'ms', 'langkah'), (4, 'ms', 'prosedur'),

  -- 5 application_result
  (5, 'en', 'outcome'), (5, 'en', 'how long'), (5, 'en', 'notif'), (5, 'en', 'hear back'), (5, 'en', 'waiting'),
  (5, 'zh', '结果'), (5, 'zh', '多久'), (5, 'zh', '通知'),
  (5, 'ms', 'keputusan permohonan'), (5, 'ms', 'berapa lama'), (5, 'ms', 'notifikasi'), (5, 'ms', 'menunggu'),

  -- 6 documents
  (6, 'en', 'document'), (6, 'en', 'certificate'), (6, 'en', 'passport'), (6, 'en', 'checklist'), (6, 'en', 'ic'), (6, 'en', 'mykad'), (6, 'en', 'transcript'),
  (6, 'zh', '文件'), (6, 'zh', '证件'), (6, 'zh', '材料'), (6, 'zh', '护照'), (6, 'zh', '身份证'), (6, 'zh', '成绩单'),
  (6, 'ms', 'dokumen'), (6, 'ms', 'sijil'), (6, 'ms', 'pasport'), (6, 'ms', 'mykad'), (6, 'ms', 'transkrip'),

  -- 7 intake_dates
  (7, 'en', 'date'), (7, 'en', 'deadline'), (7, 'en', 'intake'), (7, 'en', 'when'), (7, 'en', 'close'),
  (7, 'zh', '日期'), (7, 'zh', '截止'), (7, 'zh', '开课'), (7, 'zh', '开学'), (7, 'zh', '什么时候'), (7, 'zh', '几时'),
  (7, 'ms', 'tarikh'), (7, 'ms', 'pengambilan'), (7, 'ms', 'bila'), (7, 'ms', 'tutup'),

  -- 8 mbbs_nursing
  (8, 'en', 'mbbs'), (8, 'en', 'medicine'), (8, 'en', 'medical'), (8, 'en', 'nursing'), (8, 'en', 'doctor'),
  (8, 'zh', '医学'), (8, 'zh', '医科'), (8, 'zh', '护理'), (8, 'zh', '医生'),
  (8, 'ms', 'perubatan'), (8, 'ms', 'kejururawatan'), (8, 'ms', 'doktor'),

  -- 9 international
  (9, 'en', 'international'), (9, 'en', 'foreign'), (9, 'en', 'overseas'), (9, 'en', 'visa'),
  (9, 'zh', '国际'), (9, 'zh', '外国'), (9, 'zh', '留学生'), (9, 'zh', '签证'),
  (9, 'ms', 'antarabangsa'), (9, 'ms', 'asing'), (9, 'ms', 'visa'),

  -- 10 credit_transfer
  (10, 'en', 'credit transfer'), (10, 'en', 'transfer credit'), (10, 'en', 'transfer my credit'),
  (10, 'zh', '学分转移'), (10, 'zh', '转学分'), (10, 'zh', '学分转换'),
  (10, 'ms', 'pemindahan kredit'), (10, 'ms', 'pindah kredit'),

  -- 11 acceptance
  (11, 'en', 'accept'), (11, 'en', 'student id'), (11, 'en', 'student bill'), (11, 'en', 'pay'), (11, 'en', 'payment'), (11, 'en', 'orientation'), (11, 'en', 'portal'),
  (11, 'zh', '接受'), (11, 'zh', '缴费'), (11, 'zh', '付款'), (11, 'zh', '学生编号'), (11, 'zh', '迎新'), (11, 'zh', '注册'),
  (11, 'ms', 'terima tawaran'), (11, 'ms', 'bayar'), (11, 'ms', 'id pelajar'), (11, 'ms', 'orientasi'), (11, 'ms', 'pendaftaran'),

  -- 12 alternative_pathway
  (12, 'en', 'not eligible'), (12, 'en', 'not qualified'), (12, 'en', 'don''t meet'), (12, 'en', 'dont meet'), (12, 'en', 'fail'), (12, 'en', 'alternative'), (12, 'en', 'pathway'), (12, 'en', 'other option'),
  (12, 'zh', '不符合'), (12, 'zh', '不够'), (12, 'zh', '达不到'), (12, 'zh', '其他途径'), (12, 'zh', '没资格'), (12, 'zh', '不及格'),
  (12, 'ms', 'tidak layak'), (12, 'ms', 'tidak lulus'), (12, 'ms', 'laluan'), (12, 'ms', 'alternatif'), (12, 'ms', 'pilihan lain'),

  -- 13 fees
  (13, 'en', 'fee'), (13, 'en', 'fees'), (13, 'en', 'tuition'), (13, 'en', 'cost'), (13, 'en', 'price'), (13, 'en', 'how much'),
  (13, 'zh', '学费'), (13, 'zh', '费用'), (13, 'zh', '多少钱'), (13, 'zh', '价钱'),
  (13, 'ms', 'yuran'), (13, 'ms', 'kos'), (13, 'ms', 'harga'),

  -- 14 scholarship
  (14, 'en', 'scholarship'), (14, 'en', 'financial aid'), (14, 'en', 'loan'), (14, 'en', 'ptptn'), (14, 'en', 'sponsor'), (14, 'en', 'bursary'),
  (14, 'zh', '奖学金'), (14, 'zh', '贷款'), (14, 'zh', '助学金'), (14, 'zh', '资助'),
  (14, 'ms', 'biasiswa'), (14, 'ms', 'pinjaman'), (14, 'ms', 'bantuan kewangan'), (14, 'ms', 'tajaan'),

  -- 15 student_life
  (15, 'en', 'campus'), (15, 'en', 'hostel'), (15, 'en', 'accommodation'), (15, 'en', 'club'), (15, 'en', 'student life'), (15, 'en', 'facilit'), (15, 'en', 'faculty'), (15, 'en', 'faculties'), (15, 'en', 'kampar'), (15, 'en', 'sungai long'),
  (15, 'zh', '校区'), (15, 'zh', '校园'), (15, 'zh', '宿舍'), (15, 'zh', '学院'), (15, 'zh', '设施'), (15, 'zh', '学生生活'), (15, 'zh', '金宝'), (15, 'zh', '双溪龙'),
  (15, 'ms', 'kampus'), (15, 'ms', 'asrama'), (15, 'ms', 'fakulti'), (15, 'ms', 'kemudahan'), (15, 'ms', 'kelab'), (15, 'ms', 'kehidupan pelajar');

-- ---------------------------------------------------------------------------
-- Responses (one per intent per language)
-- ---------------------------------------------------------------------------
INSERT INTO chat_responses (intent_id, lang, response_text) VALUES
  -- 1 greeting
  (1, 'en', 'Hello! I can help with admission requirements, the application process, documents, intake dates, fees, scholarships and student life. What would you like to know?'),
  (1, 'zh', '你好！我可以帮你解答入学要求、申请程序、所需文件、开课日期、学费、奖学金和学生生活等问题。你想了解什么？'),
  (1, 'ms', 'Hai! Saya boleh membantu tentang syarat kemasukan, proses permohonan, dokumen, tarikh pengambilan, yuran, biasiswa dan kehidupan pelajar. Apa yang anda ingin tahu?'),

  -- 2 entry_requirements
  (2, 'en', 'Entry requirements depend on the programme and your qualification. Foundation programmes accept SPM, O-Level/IGCSE and UEC. Bachelor''s Degree programmes accept STPM, UEC, A-Level, Foundation/Matriculation, Diploma and other recognised qualifications. Minimum grades differ for each programme. See the <a href="admission.html">Admission page</a>.'),
  (2, 'zh', '入学要求要看课程和你的学历。基础课程接受 SPM、O-Level/IGCSE 和 UEC；学士学位课程接受 STPM、UEC、A-Level、基础课程/预科班、文凭及其他认可学历。每个课程的最低成绩要求不同。详情请看 <a href="admission.html">入学页面</a>。'),
  (2, 'ms', 'Syarat kemasukan bergantung pada program dan kelayakan anda. Program Asasi menerima SPM, O-Level/IGCSE dan UEC. Program Ijazah Sarjana Muda menerima STPM, UEC, A-Level, Asasi/Matrikulasi, Diploma dan kelayakan lain yang diiktiraf. Gred minimum berbeza bagi setiap program. Lihat <a href="admission.html">halaman Kemasukan</a>.'),

  -- 3 english_requirement
  (3, 'en', 'Most programmes require a credit or a relevant score in English. If your score is lower, Foundation students may get a conditional offer and must pass EEP Level 7 within the first two trimesters. Malaysian degree students with at least a pass in SPM English must pass IEP CEFR B2 before starting. International students need a minimum MUET, IELTS or TOEFL score. Details: <a href="admission.html">Admission page</a>.'),
  (3, 'zh', '大部分课程要求英文考到优等（credit）或相关分数。如果成绩不够：基础课程学生可能获得有条件录取，须在头两个学期内考过 EEP Level 7；SPM 英文至少及格的马来西亚学位生，须在开课前考过 IEP CEFR B2。国际学生需要达到 MUET、IELTS 或 TOEFL 的最低分数。详情：<a href="admission.html">入学页面</a>。'),
  (3, 'ms', 'Kebanyakan program memerlukan kepujian atau skor yang berkaitan dalam Bahasa Inggeris. Jika skor anda lebih rendah, pelajar Asasi mungkin menerima tawaran bersyarat dan perlu lulus EEP Level 7 dalam dua trimester pertama. Pelajar ijazah Malaysia yang sekurang-kurangnya lulus Bahasa Inggeris SPM perlu lulus IEP CEFR B2 sebelum bermula. Pelajar antarabangsa memerlukan skor minimum MUET, IELTS atau TOEFL. Butiran: <a href="admission.html">halaman Kemasukan</a>.'),

  -- 4 apply_steps
  (4, 'en', 'Applying to UTAR takes 6 steps: (1) register an account and complete the online application form, (2) upload your supporting documents, (3) get your result, (4) accept the offer by paying your Student Bill, (5) get your Student ID and UTAR Portal account, (6) attend orientation. See the <a href="application.html">Application page</a> or <a href="https://admission.utar.edu.my/Apply_Now.php" target="_blank" rel="noopener">UTAR Apply Now</a>.'),
  (4, 'zh', '申请 UTAR 有 6 个步骤：(1) 注册账号并填写网上申请表格，(2) 上传证明文件，(3) 收到结果，(4) 缴付学生账单（Student Bill）以接受录取，(5) 获取学生编号和 UTAR Portal 账号，(6) 参加迎新。详情请看 <a href="application.html">申请页面</a> 或 <a href="https://admission.utar.edu.my/Apply_Now.php" target="_blank" rel="noopener">UTAR Apply Now</a>。'),
  (4, 'ms', 'Memohon ke UTAR mempunyai 6 langkah: (1) daftar akaun dan lengkapkan borang permohonan dalam talian, (2) muat naik dokumen sokongan, (3) terima keputusan, (4) terima tawaran dengan membayar Student Bill, (5) dapatkan ID Pelajar dan akaun UTAR Portal, (6) hadiri orientasi. Lihat <a href="application.html">halaman Permohonan</a> atau <a href="https://admission.utar.edu.my/Apply_Now.php" target="_blank" rel="noopener">UTAR Apply Now</a>.'),

  -- 5 application_result
  (5, 'en', 'The outcome of your application is usually released within 7 working days by email and SMS / WhatsApp. It may take longer if credit evaluation, an assessment or an interview is needed.'),
  (5, 'zh', '申请结果一般会在 7 个工作天内通过电邮和 SMS / WhatsApp 通知。如需学分评估、测验或面试，可能需要更长时间。'),
  (5, 'ms', 'Keputusan permohonan biasanya dikeluarkan dalam masa 7 hari bekerja melalui e-mel dan SMS / WhatsApp. Ia mungkin mengambil masa lebih lama jika penilaian kredit, ujian atau temu duga diperlukan.'),

  -- 6 documents
  (6, 'en', 'When you apply, provide the supporting documents listed in UTAR''s Application Checklist. At registration, bring your Health Examination Report, the original and a photocopy of your educational certificates, and your MyKad (Malaysians) or passport (international students). See the <a href="application.html">Application page</a>.'),
  (6, 'zh', '申请时，请提供 UTAR 申请清单（Application Checklist）列出的证明文件。注册时请带上健康检查报告、学历证书正本及影印本，以及 MyKad（马来西亚人）或护照（国际学生）。详情请看 <a href="application.html">申请页面</a>。'),
  (6, 'ms', 'Semasa memohon, sediakan dokumen sokongan yang tersenarai dalam Application Checklist UTAR. Semasa pendaftaran, bawa Laporan Pemeriksaan Kesihatan, sijil pendidikan asal dan salinannya, serta MyKad (warganegara Malaysia) atau pasport (pelajar antarabangsa). Lihat <a href="application.html">halaman Permohonan</a>.'),

  -- 7 intake_dates
  (7, 'en', 'The next Foundation and Bachelor''s Degree intakes start on 25 January 2027 and 9 June 2027. Nursing starts on 9 June 2027, and MBBS has one intake a year in October. Most application closing dates are not published, so please check the <a href="https://admission.utar.edu.my/intake-and-Academic-Calendar.php" target="_blank" rel="noopener">official intake calendar</a>.'),
  (7, 'zh', '基础课程和学士课程接下来的开课日期是 2027 年 1 月 25 日和 2027 年 6 月 9 日。护理课程在 2027 年 6 月 9 日开课，MBBS 每年只有 10 月一次。大部分课程没有公布申请截止日期，请查看 <a href="https://admission.utar.edu.my/intake-and-Academic-Calendar.php" target="_blank" rel="noopener">官方开课日期</a>。'),
  (7, 'ms', 'Pengambilan Asasi dan Ijazah Sarjana Muda seterusnya bermula pada 25 Januari 2027 dan 9 Jun 2027. Kejururawatan bermula pada 9 Jun 2027, dan MBBS mempunyai satu pengambilan setahun pada bulan Oktober. Kebanyakan tarikh tutup permohonan tidak diumumkan, jadi sila semak <a href="https://admission.utar.edu.my/intake-and-Academic-Calendar.php" target="_blank" rel="noopener">kalendar pengambilan rasmi</a>.'),

  -- 8 mbbs_nursing
  (8, 'en', 'Medicine (MBBS) and Nursing have additional entry requirements. MBBS has one intake per year (October), and Nursing has intakes in October and June (next: 9 June 2027). Please check the official requirements on the <a href="https://admission.utar.edu.my/Entry-Qualifications-and-English-Language-Requirements.php" target="_blank" rel="noopener">UTAR admission website</a>.'),
  (8, 'zh', '医学（MBBS）和护理课程有额外的入学要求。MBBS 每年只有一次开课（10 月），护理课程在 10 月和 6 月开课（下一次：2027 年 6 月 9 日）。请到 <a href="https://admission.utar.edu.my/Entry-Qualifications-and-English-Language-Requirements.php" target="_blank" rel="noopener">UTAR 招生网站</a> 查看官方要求。'),
  (8, 'ms', 'Perubatan (MBBS) dan Kejururawatan mempunyai syarat kemasukan tambahan. MBBS mempunyai satu pengambilan setahun (Oktober), dan Kejururawatan mempunyai pengambilan pada bulan Oktober dan Jun (seterusnya: 9 Jun 2027). Sila semak syarat rasmi di <a href="https://admission.utar.edu.my/Entry-Qualifications-and-English-Language-Requirements.php" target="_blank" rel="noopener">laman kemasukan UTAR</a>.'),

  -- 9 international
  (9, 'en', 'International students should apply at least 12 weeks before the programme starts. Applications sent less than 4 weeks before may be moved to the next intake. You will also need a minimum English test score (e.g. MUET, IELTS or TOEFL) and your passport for registration.'),
  (9, 'zh', '国际学生请在开课前至少 12 周申请；开课前不足 4 周提交的申请，可能会被安排到下一个学期。你也需要达到英文考试（例如 MUET、IELTS 或 TOEFL）的最低分数，注册时须带护照。'),
  (9, 'ms', 'Pelajar antarabangsa perlu memohon sekurang-kurangnya 12 minggu sebelum program bermula. Permohonan yang dihantar kurang daripada 4 minggu sebelumnya mungkin dipindahkan ke pengambilan seterusnya. Anda juga memerlukan skor minimum ujian Bahasa Inggeris (contohnya MUET, IELTS atau TOEFL) dan pasport untuk pendaftaran.'),

  -- 10 credit_transfer
  (10, 'en', 'To apply for credit transfer, include certified copies of your academic transcripts, programme structure and course syllabus with your application.'),
  (10, 'zh', '申请学分转移时，请在申请中附上成绩单、课程结构和课程大纲的认证副本。'),
  (10, 'ms', 'Untuk memohon pemindahan kredit, sertakan salinan transkrip akademik, struktur program dan sukatan kursus yang disahkan bersama permohonan anda.'),

  -- 11 acceptance
  (11, 'en', 'To accept your offer, pay the fees shown in your Student Bill by the due date and keep the receipt. Your Student ID is created after payment (about 3 working days via JomPAY or Public Bank). Then log in to the UTAR Portal, create your UTAR email and complete the Student Verification Exercise.'),
  (11, 'zh', '要接受录取，请在截止日期前缴付学生账单（Student Bill）上的费用，并保留收据。付款后会生成学生编号（通过 JomPAY 或 Public Bank 约 3 个工作天）。之后登入 UTAR Portal，开设 UTAR 电邮，并完成学生资料核实（Student Verification Exercise）。'),
  (11, 'ms', 'Untuk menerima tawaran, bayar yuran dalam Student Bill sebelum tarikh akhir dan simpan resit. ID Pelajar dijana selepas bayaran (kira-kira 3 hari bekerja melalui JomPAY atau Public Bank). Kemudian log masuk ke UTAR Portal, cipta e-mel UTAR dan lengkapkan Student Verification Exercise.'),

  -- 12 alternative_pathway
  (12, 'en', 'If you do not meet a requirement yet, you still have options. For example, students who do not meet the English requirement may be admitted with conditions, and other qualifications such as a diploma from a college or polytechnic are considered case by case. The <b>Alternative Pathway Recommendation</b> tool on the <a href="admission.html#tools">Admission page</a> will suggest routes for you.'),
  (12, 'zh', '如果你暂时不符合某项要求，还是有其他选择。例如英文成绩不够的学生可能获得有条件录取；学院或理工学院的文凭等其他学历会个别审核。<a href="admission.html#tools">入学页面</a> 上的<b>其他升学途径推荐</b>会为你建议适合的途径。'),
  (12, 'ms', 'Jika anda belum memenuhi sesuatu syarat, anda masih ada pilihan. Contohnya, pelajar yang tidak memenuhi syarat Bahasa Inggeris mungkin diterima masuk dengan syarat, dan kelayakan lain seperti diploma dari kolej atau politeknik dipertimbangkan secara kes demi kes. Alat <b>Cadangan Laluan Alternatif</b> di <a href="admission.html#tools">halaman Kemasukan</a> akan mencadangkan laluan untuk anda.'),

  -- 13 fees
  (13, 'en', 'Tuition fees depend on the programme and study level. See the <a href="fees.html">Tuition Fees page</a> and always confirm the latest fees with UTAR.'),
  (13, 'zh', '学费要看课程和学习程度而定。请查看 <a href="fees.html">学费页面</a>，并以 UTAR 最新公布的费用为准。'),
  (13, 'ms', 'Yuran pengajian bergantung pada program dan tahap pengajian. Lihat <a href="fees.html">halaman Yuran Pengajian</a> dan sentiasa sahkan yuran terkini dengan UTAR.'),

  -- 14 scholarship
  (14, 'en', 'Please see the <a href="scholarship.html">Scholarship Information page</a> for scholarships and financial aid, and links to official UTAR information.'),
  (14, 'zh', '请查看 <a href="scholarship.html">奖学金资讯页面</a>，了解奖学金、助学金和 UTAR 官方资讯链接。'),
  (14, 'ms', 'Sila lihat <a href="scholarship.html">halaman Maklumat Biasiswa</a> untuk biasiswa dan bantuan kewangan, serta pautan ke maklumat rasmi UTAR.'),

  -- 15 student_life
  (15, 'en', 'UTAR has two campuses: Kampar and Sungai Long. See the <a href="student-life.html">Student Life page</a> for an overview of <a href="student-life.html#campus">campuses</a>, <a href="student-life.html#faculty">faculties</a> and <a href="student-life.html#facilities">facilities</a>.'),
  (15, 'zh', 'UTAR 有两个校区：金宝（Kampar）和双溪龙（Sungai Long）。请查看 <a href="student-life.html">学生生活页面</a>，了解<a href="student-life.html#campus">校区</a>、<a href="student-life.html#faculty">学院</a>和<a href="student-life.html#facilities">设施</a>。'),
  (15, 'ms', 'UTAR mempunyai dua kampus: Kampar dan Sungai Long. Lihat <a href="student-life.html">halaman Kehidupan Pelajar</a> untuk gambaran <a href="student-life.html#campus">kampus</a>, <a href="student-life.html#faculty">fakulti</a> dan <a href="student-life.html#facilities">kemudahan</a>.'),

  -- 16 fallback
  (16, 'en', 'Sorry, I don''t have an answer for that yet. Please check the <a href="https://admission.utar.edu.my/FAQs.php" target="_blank" rel="noopener">UTAR admission FAQs</a> or contact UTAR''s Division of Admissions and Credit Evaluation (DACE).'),
  (16, 'zh', '抱歉，我暂时没有这个问题的答案。请查看 <a href="https://admission.utar.edu.my/FAQs.php" target="_blank" rel="noopener">UTAR 招生常见问题</a>，或联系 UTAR 招生与学分评估部（DACE）。'),
  (16, 'ms', 'Maaf, saya belum mempunyai jawapan untuk soalan itu. Sila semak <a href="https://admission.utar.edu.my/FAQs.php" target="_blank" rel="noopener">Soalan Lazim kemasukan UTAR</a> atau hubungi Bahagian Kemasukan dan Penilaian Kredit (DACE) UTAR.');
