import {
    Controller,
    HttpException,
    HttpStatus,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const uploadDir = process.env.UPLOAD_DIR || '/var/www/uploads/books';
const publicUrl = process.env.PUBLIC_UPLOAD_URL || 'https://diambra.net/uploads';
const pdfsDir = `${uploadDir}/pdfs`;
const starDir = 'public/uploads/star';
const starPublicUrl = `${publicUrl}/star`;

try {
    if (!fs.existsSync(starDir)) fs.mkdirSync(starDir, { recursive: true, mode: 0o755 });
} catch (e) {
    console.error(`❌ Erreur création dossier star:`, e);
}

try {
    if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir, { recursive: true, mode: 0o755 });
} catch (e) {
    console.error(`❌ Erreur création dossiers PDF:`, e);
}


const storage = diskStorage({
    destination: (_req, file, cb) => {
        if (file.fieldname === 'pdfFile') cb(null, pdfsDir);
        else cb(new Error('Champ fichier non supporté'), '');
    },
    filename: (_req, file, cb) => {
        const uniqueName = crypto.randomBytes(16).toString('hex');
        const ext = extname(file.originalname).toLowerCase();
        const prefix = file.fieldname === 'pdfFile' ? 'book' : file.fieldname;
        cb(null, `${prefix}-${uniqueName}${ext}`);
    },
});

const starImageStorage = diskStorage({
    destination: (_req, _file, cb) => cb(null, starDir),
    filename: (_req, file, cb) => {
        const unique = crypto.randomBytes(16).toString('hex');
        const ext = extname(file.originalname).toLowerCase();
        cb(null, `star-${unique}${ext}`);
    },
});

import { Request } from 'express';
import { FileFilterCallback } from 'multer';

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {

    if (file.fieldname === 'pdfFile') {
        if (!file.mimetype.match(/^application\/pdf$/)) {
            // La signature attend cb(null, false) pour rejet, ou cb(error) pour erreur fatale
            return cb(new Error('Seuls les fichiers PDF sont acceptés'));
        }
    }
    cb(null, true);
}

@Controller('upload')
export class UploadController {

    @Post('star-image')
    @UseInterceptors(
        FileInterceptor('image', {
            storage: starImageStorage,
            limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
            fileFilter: (_req, file, cb) => {
                const ok = /^image\/(png|jpeg|jpg|webp|gif)$/.test(file.mimetype);
                cb(ok ? null : new Error('Format image non supporté'), ok);
            },
        })
    )
    async uploadStarImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new HttpException('Aucune image reçue', HttpStatus.BAD_REQUEST);
        }
        const url = `${starPublicUrl}/${file.filename}`;
        return { url };
    }
    @Post('pdf')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(
        FileInterceptor('pdfFile', {
            storage,
            limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo max
            // fileFilter,
        })
    )
    async uploadPdf(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new HttpException('Aucun fichier PDF reçu', HttpStatus.BAD_REQUEST);
        }
        const url = `${publicUrl}/books/pdfs/${file.filename}`;
        return { url };
    }
}
