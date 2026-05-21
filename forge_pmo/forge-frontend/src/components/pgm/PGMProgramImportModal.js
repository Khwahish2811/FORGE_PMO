import React from 'react';
import {
  modalOverlay, modalBox, primBtn, secBtn
} from '../common/DashboardStyles';

export default function PGMProgramImportModal({
  showImportModal,
  onClose,
  isParsing,
  parsedRecords,
  parseSummary,
  isImporting,
  onFileChange,
  onDownloadTemplate,
  onApproveImport,
  formatDate
}) {
  if (!showImportModal) return null;

  return (
    <div style={modalOverlay}>
      <div style={{ ...modalBox, width: parsedRecords.length > 0 ? '900px' : '550px', maxHeight: '90vh', overflowY: 'auto', transition: 'width 0.3s ease-in-out' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1B3A6B' }}>Automated Spreadsheet Bulk Program Import</h3>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Upload Excel (.xlsx, .xls) or CSV files to quickly provision multiple programs.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
        </div>

        {/* Drag & Drop Standard File Upload Block */}
        <div style={{ padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '10px', background: '#f8fafc', textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 5px 0', fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>Drag and drop your Excel or CSV file here, or click to upload</p>
          <p style={{ margin: '0 0 15px 0', fontSize: '11px', color: '#64748b' }}>Supports headers: <b>Program Name</b>, <b>Description</b>, <b>Start Date</b>, <b>End Date</b></p>
          
          <input 
            type="file" 
            accept=".csv, .xlsx, .xls" 
            onChange={onFileChange} 
            style={{ display: 'none' }} 
            id="bulk-excel-uploader" 
          />
          <label 
            htmlFor="bulk-excel-uploader" 
            style={{ ...primBtn, background: '#2563eb', padding: '8px 16px', fontSize: '12px', display: 'inline-block', cursor: 'pointer' }}
          >
            Choose File
          </label>

          <button 
            onClick={onDownloadTemplate} 
            style={{ background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline', fontSize: '12px', marginLeft: '15px', cursor: 'pointer', fontWeight: '600' }}
          >
            Download CSV Template
          </button>
        </div>

        {/* LOADING SPINNER */}
        {isParsing && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ margin: '15px 0 0 0', fontSize: '13px', color: '#475569', fontWeight: '600' }}>Parsing spreadsheet & running database duplicate validation checks...</p>
          </div>
        )}

        {/* PREVIEW CONTAINER */}
        {!isParsing && parsedRecords.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', padding: '12px 18px', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: '#1e3a8a', fontWeight: 'bold' }}>
                Spreadsheet Parsed: <b>{parseSummary?.total_records} Rows Total</b>
              </div>
              <div style={{ display: 'flex', gap: '15px', fontSize: '12px' }}>
                <span style={{ color: '#166534', fontWeight: 'bold' }}>✓ {parseSummary?.valid_records} Ready</span>
                <span style={{ color: '#991b1b', fontWeight: 'bold' }}>✗ {parseSummary?.invalid_records} Errors</span>
              </div>
            </div>

            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#1e293b' }}>Import Preview Table</h4>
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#475569', fontWeight: 'bold' }}>ROW</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#475569', fontWeight: 'bold' }}>PROGRAM NAME</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#475569', fontWeight: 'bold' }}>TIMELINE</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#475569', fontWeight: 'bold' }}>DESCRIPTION</th>
                    <th style={{ padding: '10px', textAlign: 'left', color: '#475569', fontWeight: 'bold' }}>VERIFICATION</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRecords.map((r) => (
                    <tr 
                      key={r.row_index} 
                      style={{ 
                        borderBottom: '1px solid #e2e8f0', 
                        background: r.is_valid ? '#fefefe' : '#fff5f5',
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#64748b' }}>{r.row_index}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: r.is_valid ? '#0f172a' : '#991b1b' }}>{r.name || '(Empty)'}</td>
                      <td style={{ padding: '10px', color: '#475569' }}>
                        {r.start_date || r.end_date ? `${formatDate(r.start_date)} to ${formatDate(r.end_date)}` : 'No Dates Specified'}
                      </td>
                      <td style={{ padding: '10px', color: '#64748b', maxLines: 1, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '200px' }}>
                        {r.description || '-'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        {r.is_valid ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold', fontSize: '10px' }}>
                            ✓ Ready to Import
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold', fontSize: '10px', width: 'fit-content' }}>
                              ✗ Validation Failed
                            </span>
                            <ul style={{ margin: 0, paddingLeft: '12px', color: '#b91c1c', fontSize: '10px', lineHeight: '1.3' }}>
                              {r.errors.map((err, errIdx) => (
                                <li key={errIdx}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={onClose} 
                style={{ ...secBtn, padding: '8px 16px', fontSize: '12px' }}
              >
                Clear Preview
              </button>
              <button 
                disabled={isImporting || parseSummary?.valid_records === 0} 
                onClick={onApproveImport} 
                style={{ 
                  ...primBtn, 
                  background: parseSummary?.valid_records === 0 ? '#cbd5e1' : '#10b981', 
                  cursor: parseSummary?.valid_records === 0 ? 'not-allowed' : 'pointer',
                  padding: '8px 18px',
                  fontSize: '12px',
                  color: '#fff'
                }}
              >
                {isImporting ? 'Importing Valid Programs...' : `Approve & Import ${parseSummary?.valid_records} Programs`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
