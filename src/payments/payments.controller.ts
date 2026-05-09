
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permission } from '../common/enums/permission.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { UserDocument } from '../users/schemas/user.schema';
import { MoneyfusionCallbackDto } from './dto/moneyfusion-callback.dto';
import { VerifyMoneyfusionDto } from './dto/verify-moneyfusion.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Paiements')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  // ==================== MONEYFUSION ENDPOINTS ====================

  /**
   * Endpoint pour vérifier le paiement MoneyFusion (proxy sécurisé)
   * Appelle MoneyFusion, enregistre le paiement si succès
   */
  @Post('moneyfusion/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vérifier paiement MoneyFusion',
    description: 'Proxy la vérification MoneyFusion et enregistre le paiement si validé.',
  })
  @ApiBody({ type: VerifyMoneyfusionDto })
  @ApiResponse({
    status: 200,
    description: 'Statut du paiement MoneyFusion retourné.',
  })
  @ApiResponse({
    status: 400,
    description: 'Token invalide ou paiement déjà utilisé.',
  })
  @ApiResponse({
    status: 502,
    description: 'Erreur de communication avec MoneyFusion.',
  })
  async verifyMoneyfusion(@Body() body: VerifyMoneyfusionDto) {
    return this.paymentsService.verifyMoneyfusionPayment(body.token);
  }


  /**
 * Initier un paiement MoneyFusion
 * Appelle MoneyFusion, stocke le tokenPay, retourne l'URL de paiement
 */
  @Post('moneyfusion/initiate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Initier un paiement MoneyFusion',
    description: 'Appelle MoneyFusion, stocke le tokenPay, retourne l\'URL de paiement.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        countryCode: { type: 'string', example: 'ci' },
        phone: { type: 'string', example: '2250700000000' },
        amount: { type: 'number', example: 1000 },
        withdraw_mode: { type: 'string', example: 'orange-money-ci' },
        callback_url: { type: 'string', example: 'https://votre-site.com/callback' },
        metadata: { type: 'object', example: { consultationId: '...', userId: '...' } },
      },
      required: ['countryCode', 'phone', 'amount', 'withdraw_mode', 'callback_url'],
    },
  })
  @ApiResponse({ status: 201, description: 'URL de paiement MoneyFusion retournée.' })
  @ApiResponse({ status: 400, description: 'Paramètres invalides.' })
  async initiateMoneyfusion(@Body() body: any, @CurrentUser() user: UserDocument) {
    return this.paymentsService.initiateMoneyfusionPayment({ ...body, userId: user._id.toString() });
  }

  /**
   * Endpoint pour callback MoneyFusion
   * Reçoit les infos de paiement validé depuis le frontend ou MoneyFusion
   */
  @Post('moneyfusion/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Callback MoneyFusion',
    description: 'Enregistre le paiement validé MoneyFusion et crédite le compte utilisateur.',
  })
  @ApiBody({ type: MoneyfusionCallbackDto })
  @ApiResponse({
    status: 200,
    description: 'Paiement MoneyFusion enregistré avec succès.',
  })
  @ApiResponse({
    status: 400,
    description: 'Paiement déjà traité ou données invalides.',
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur introuvable.',
  })
  async moneyfusionCallback(
    @CurrentUser() user: UserDocument,
    @Body() body: MoneyfusionCallbackDto,
  ) {
    return this.paymentsService.handleMoneyfusionCallback(user._id.toString(), body);
  }

  /**
   * Webhook MoneyFusion (notification asynchrone serveur)
   * Ne nécessite pas d'authentification JWT
   */
  @Post('moneyfusion/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook MoneyFusion',
    description: 'Reçoit les notifications de paiement depuis MoneyFusion (serveur à serveur).',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook traité avec succès.',
  })
  @ApiResponse({
    status: 400,
    description: 'Données de webhook invalides.',
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur introuvable pour le paiement.',
  })
  @ApiExcludeEndpoint(process.env.NODE_ENV === 'production') // Cache en production pour la sécurité
  async moneyfusionWebhook(@Body() body: any) {
    return this.paymentsService.handleMoneyfusionWebhook(body);
  }

  /**
   * Callback déclenché par le frontend après vérification MoneyFusion (consultations)
   */
  @Post('callback')
  @Public()
  @HttpCode(HttpStatus.OK)
  async frontendCallback(@Body() body: any) {
    return this.paymentsService.handleClientCallback({ ...body, type: 'consultation' });
  }

  /**
   * Callback déclenché par le frontend pour les achats de livres
   */
  @Post('callback/books')
  @Public()
  @HttpCode(HttpStatus.OK)
  async frontendBooksCallback(@Body() body: any) {
    return this.paymentsService.handleClientCallback({ ...body, type: 'book' });
  }

  // ==================== ROUTES GÉNÉRIQUES ====================

  /**
   * Créer un paiement standard
   */
  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CREATE_PAYMENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Créer un paiement',
    description: 'Crée un nouveau paiement standard.',
  })
  @ApiResponse({
    status: 201,
    description: 'Paiement créé avec succès.',
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides.',
  })
  @ApiResponse({
    status: 403,
    description: 'Permissions insuffisantes.',
  })
  create(@CurrentUser() user: UserDocument, @Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(user._id.toString(), createPaymentDto);
  }

  /**
   * Lister tous les paiements (admin/consultant uniquement)
   */
  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_PAYMENT)
  @ApiOperation({
    summary: 'Lister les paiements',
    description: 'Retourne la liste des paiements (admin/consultant).',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numéro de page (défaut: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: "Nombre d'éléments par page (défaut: 10, max: 100)",
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PaymentStatus,
    description: 'Filtrer par statut de paiement',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Filtrer par ID utilisateur',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des paiements retournée.',
  })
  @ApiResponse({
    status: 403,
    description: 'Permissions insuffisantes.',
  })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: PaymentStatus,
    @Query('userId') userId?: string,
  ) {
    // Validation des paramètres
    if (page < 1) {
      throw new BadRequestException('Le numéro de page doit être supérieur à 0');
    }
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('La limite doit être entre 1 et 100');
    }

    return this.paymentsService.findAll({
      page,
      limit,
      status,
      userId,
    });
  }

  /**
   * Obtenir mes paiements (utilisateur connecté)
   */
  @Get('my')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_OWN_PAYMENT)
  @ApiOperation({
    summary: 'Mes paiements',
    description: "Retourne les paiements de l'utilisateur connecté.",
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numéro de page (défaut: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: "Nombre d'éléments par page (défaut: 10, max: 100)",
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: "Liste des paiements de l'utilisateur.",
  })
  @ApiResponse({
    status: 403,
    description: 'Permissions insuffisantes.',
  })
  findMyPayments(
    @CurrentUser() user: UserDocument,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    // Validation des paramètres
    if (page < 1) {
      throw new BadRequestException('Le numéro de page doit être supérieur à 0');
    }
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('La limite doit être entre 1 et 100');
    }

    return this.paymentsService.findAll({
      page,
      limit,
      userId: user._id.toString(),
    });
  }

  /**
   * Obtenir les statistiques de paiements
   */
  @Get('statistics')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.VIEW_STATISTICS)
  @ApiOperation({
    summary: 'Statistiques des paiements',
    description: 'Retourne les statistiques globales des paiements.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistiques retournées.',
  })
  @ApiResponse({
    status: 403,
    description: 'Permissions insuffisantes.',
  })
  getStatistics() {
    return this.paymentsService.getStatistics();
  }

  /**
   * Vérifier le statut d'un paiement MoneyFusion
   * GET /api/v1/payments/verify?token=xxx
   */
  @Get('verify')
  @Public()
  @ApiOperation({
    summary: "Vérifier le statut d'un paiement",
    description: "Vérifie le statut d'un paiement MoneyFusion via son token.",
  })
  @ApiQuery({
    name: 'token',
    type: String,
    description: 'Token MoneyFusion du paiement',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Statut du paiement vérifié.',
  })
  @ApiResponse({
    status: 400,
    description: 'Token invalide ou manquant.',
  })
  async verifyPayment(@Query('token') token: string) {
    const verification = await this.paymentsService.verifyPayment(token);
    return verification;
  }

  /**
   * Obtenir un paiement par ID
   * Vérification des permissions pour s'assurer que l'utilisateur peut voir ce paiement
   */
  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_OWN_PAYMENT, Permission.READ_ANY_PAYMENT)
  @ApiOperation({
    summary: 'Obtenir un paiement',
    description: 'Retourne un paiement spécifique par son ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID du paiement',
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Paiement retourné.',
  })
  @ApiResponse({
    status: 404,
    description: 'Paiement introuvable.',
  })
  @ApiResponse({
    status: 403,
    description: 'Permissions insuffisantes.',
  })
  async findOne(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    const payment = await this.paymentsService.findOne(id);

    // Vérification supplémentaire pour s'assurer que l'utilisateur peut voir ce paiement
    // Cette logique pourrait être déplacée dans le service ou un guard personnalisé
    const hasReadAnyPermission = user.customPermissions?.includes(Permission.READ_ANY_PAYMENT);
    const isOwner = payment.userId?.toString() === user._id.toString();

    if (!hasReadAnyPermission && !isOwner) {
      throw new BadRequestException("Vous n'avez pas accès à ce paiement");
    }

    return payment;
  }

  /**
   * Mettre à jour un paiement
   */
  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.UPDATE_PAYMENT)
  @ApiOperation({
    summary: 'Mettre à jour un paiement',
    description: "Met à jour les informations d'un paiement.",
  })
  @ApiParam({
    name: 'id',
    description: 'ID du paiement',
    type: String,
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Paiement mis à jour.',
  })
  @ApiResponse({
    status: 404,
    description: 'Paiement introuvable.',
  })
  @ApiResponse({
    status: 403,
    description: 'Permissions insuffisantes.',
  })
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  /**
   * Traiter le paiement d'une consultation
   * POST /api/v1/payments/process-consultation
   * Body: { token, paymentData }
   */
  @Post('process-consultation')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Traiter le paiement d'une consultation",
    description: "Vérifie le paiement et crée la consultation avec génération d'analyse.",
  })
  @ApiBody({
    schema: {
      properties: {
        token: { type: 'string', example: 'abc123def456' },
        paymentData: { type: 'object' },
      },
      required: ['token', 'paymentData'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Consultation créée et paiement enregistré.',
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou paiement non valide.',
  })
  async processConsultationPayment(@Body() body: ProcessPaymentDto) {
    return this.paymentsService.processConsultationPayment(body.token, body.paymentData);
  }

  /**
   * Traiter le paiement d'un livre
   * POST /api/v1/payments/process-book
   * Body: { token, paymentData }
   */
  @Post('process-book')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Traiter le paiement d'un livre",
    description: "Vérifie le paiement, enregistre l'achat et génère le lien de téléchargement.",
  })
  @ApiBody({
    schema: {
      properties: {
        token: { type: 'string', example: 'abc123def456' },
        paymentData: { type: 'object' },
      },
      required: ['token', 'paymentData'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Achat enregistré et lien de téléchargement généré.',
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides ou paiement non valide.',
  })
  async processBookPayment(@Body() body: ProcessPaymentDto) {
    return this.paymentsService.processBookPayment(body.token, body.paymentData);
  }
}
