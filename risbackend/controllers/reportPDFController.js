// controllers/reportPDFController.js
const pdfService = require("../services/pdfService");
const { pool } = require("../config/postgres");
const dayjs = require("dayjs");
const HospitalSettingsModel = require("../models/hospitalSettingsModel");

exports.generatePdf = async (req, res) => {
  try {
    const studyId = req.params.studyId;

    // 1. Fetch Report Data
    const qReport = `
      SELECT study_instance_uid, content, status, patient_name, patient_id,
             accession_number, modality, study_date, created_by, created_at
      FROM pacs_reports
      WHERE study_instance_uid = $1
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
      LIMIT 1
    `;
    const rReport = await pool.query(qReport, [studyId]);
    if (rReport.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }
    const rep = rReport.rows[0];

    // 2. Fetch Hospital Settings
    const settings = (await HospitalSettingsModel.get()) || {};

    // 3. Fetch Key Images
    const qImages = `
      SELECT file_path 
      FROM report_key_images 
      WHERE study_instance_uid = $1 
      ORDER BY created_at ASC
    `;
    const rImages = await pool.query(qImages, [studyId]);
    const keyImages = rImages.rows;

    // 4. Prepare Data for Template
    const studyDate = rep.study_date ? dayjs(rep.study_date).format("DD-MMM-YYYY") : "";
    const reportDate = rep.created_at ? dayjs(rep.created_at).format("DD-MMM-YYYY HH:mm") : "";

    // Sanitize content
    const safeContent = rep.content || "<p><em>No report content</em></p>";

    // Build HTML
    // Note: We use absolute paths or base64 for images in PDF if needed, 
    // but html-pdf-node (if used) might need http urls. 
    // Assuming pdfService handles local paths or we use a public URL.
    // For now, we'll try to use the /api/uploads/keyimages/ path if the PDF renderer can reach localhost,
    // otherwise we might need file system paths. 
    // Ideally, for a robust system, we should read file to base64.
    // Let's assume the PDF service runs in the same container/context.

    // Logo processing (placeholder logic)
    const logoHtml = settings.logo_path
      ? `<img src="${settings.logo_path}" style="height:60px; max-width:200px;" alt="Logo"/>`
      : `<div style="font-size:24px; font-weight:bold; color:#0056b3;">${settings.name || "RADIOLOGY CENTER"}</div>`;

    let userImagesHtml = "";
    if (keyImages.length > 0) {
      userImagesHtml = `
        <div class="page-break-before"></div>
        <div class="key-images-section">
          <h3 style="border-bottom:1px solid #ccc; padding-bottom:5px;">Key Images</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            ${keyImages.map(img => `
                <div style="width: 48%; margin-bottom: 10px; border:1px solid #eee; padding:5px;">
                  <img src="http://localhost:${process.env.PORT || 5000}/api/uploads/keyimages/${img.file_path}" 
                       style="width:100%; height:200px; object-fit: contain;" />
                </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Report - ${rep.patient_name || ""}</title>
        <style>
          @page { margin: 20mm 15mm 25mm 15mm; }
          body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #333; }
          
          /* Header */
          .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0056b3; padding-bottom: 15px; margin-bottom: 20px; }
          .hospital-info { text-align: right; }
          .hospital-name { font-size: 18pt; font-weight: bold; color: #0056b3; margin-bottom: 4px; }
          .hospital-details { font-size: 9pt; color: #555; }
          
          /* Patient Meta Grid */
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f9f9f9; padding: 15px; border-radius: 4px; border: 1px solid #eee; margin-bottom: 25px; font-size: 10pt; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .meta-label { font-weight: bold; color: #555; width: 100px; }
          .meta-value { font-weight: 600; color: #000; flex: 1; }
          
          /* Content */
          .report-title { text-align: center; text-transform: uppercase; font-size: 14pt; font-weight: bold; margin-bottom: 20px; text-decoration: underline; color: #000; }
          .report-content { min-height: 300px; text-align: justify; }
          
          /* Images */
          .key-images-section { margin-top: 20px; }
          
          /* Footer */
          .footer { position: fixed; bottom: 0; left: 0; right: 0; height: 50px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 8pt; color: #777; display: flex; justify-content: space-between; }
          .disclaimer { font-size: 7pt; margin-top: 5px; color: #999; text-align: justify; }
          
          .signature-block { margin-top: 40px; text-align: right; page-break-inside: avoid; }
          .sign-line { display: inline-block; border-top: 1px solid #000; padding-top: 5px; min-width: 200px; text-align: center; font-weight: bold; }
          
          .page-break-before { page-break-before: always; }
        </style>
      </head>
      <body>
        
        <!-- Header -->
        <div class="header-container">
          <div class="logo-area">
             ${logoHtml}
          </div>
          <div class="hospital-info">
             <div class="hospital-name">${settings.name || "RAD CLINIC"}</div>
             <div class="hospital-details">
               ${settings.address || "Address Line 1"}<br/>
               ${settings.phone ? `Ph: ${settings.phone}` : ""} ${settings.email ? `| Email: ${settings.email}` : ""}
             </div>
          </div>
        </div>

        <!-- Patient Demographics -->
        <div class="meta-grid">
           <div>
              <div class="meta-row"><span class="meta-label">Patient Name:</span> <span class="meta-value">${rep.patient_name || "—"}</span></div>
              <div class="meta-row"><span class="meta-label">Patient ID:</span> <span class="meta-value">${rep.patient_id || "—"}</span></div>
              <div class="meta-row"><span class="meta-label">Age/Gender:</span> <span class="meta-value">—</span></div>
           </div>
           <div>
              <div class="meta-row"><span class="meta-label">Modality:</span> <span class="meta-value">${rep.modality || "—"}</span></div>
              <div class="meta-row"><span class="meta-label">Date:</span> <span class="meta-value">${studyDate}</span></div>
              <div class="meta-row"><span class="meta-label">Accession:</span> <span class="meta-value">${rep.accession_number || "—"}</span></div>
           </div>
        </div>

        <!-- Report Body -->
        <div class="report-title">Radiology Report</div>
        
        <div class="report-content">
           ${safeContent}
        </div>

        <!-- Signature -->
        <div class="signature-block">
           <div class="sign-line">
              ${rep.created_by || "Radiologist"}<br/>
              <span style="font-weight:normal; font-size:9pt;">Verified on ${reportDate}</span>
           </div>
        </div>

        <!-- Key Images -->
        ${userImagesHtml}

        <!-- Footer -->
        <div class="footer">
           <div>
              Printed on: ${dayjs().format("DD-MMM-YYYY HH:mm")}<br/>
              Generated by RIS
           </div>
           <div style="max-width: 60%; text-align:right;">
             <div class="disclaimer">
               ${settings.footer_text || "This report is electronically generated. Please correlate clinically. Not valid for medico-legal purposes."}
             </div>
             Page <span class="pageNumber"></span>
           </div>
        </div>

      </body>
      </html>
    `;

    const buffer = await pdfService.generatePdfBuffer(html);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="report_${studyId}.pdf"`);
    return res.send(buffer);
  } catch (err) {
    console.error("generatePdf error", err);
    return res.status(500).json({ success: false, message: err.message || String(err) });
  }
};
