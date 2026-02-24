import multer from 'multer';

/**
 * Multer instance configured with in-memory storage.
 * No file is ever written to disk — the buffer lives only in req.file.buffer.
 *
 * Restrictions:
 *   - Only .xlsx files are accepted (checked by both mimetype and extension)
 *   - Maximum file size: 5 MB
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  const ext = file.originalname.split('.').pop().toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) || ext === 'xlsx') {
    cb(null, true);
  } else {
    cb(new Error('Only .xlsx files are accepted'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

export default upload;
