/**
 * Zod Validation Schemas
 * Strict input validation for all API endpoints
 * All schemas use .strict() to reject extra fields
 */

import { z } from 'zod'

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const loginSchema = z.object({
    email: z.string().email('Invalid email address').max(255),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
}).strict()

export const registerSchema = z.object({
    email: z.string().email('Invalid email address').max(255),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128)
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Password must contain uppercase, lowercase, and number'
        ),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
}).strict()

// ============================================================================
// AGENT SCHEMAS
// ============================================================================

export const agentTypeSchema = z.enum([
    'business_snapshot',
    'ad_copy',
    'graphics',
    'landing_page',
    'social_media',
    'seo',
    'pricing',
    'growth',
    'deep_research',
    'image_generation',
    'linkedin_headshot',

])

export const chatMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(50000),
}).strict()

export const agentChatSchema = z.object({
    messages: z.array(chatMessageSchema).min(1).max(100),
    agent_type: agentTypeSchema.optional(),
}).strict()

export const createSessionSchema = z.object({
    agent_type: agentTypeSchema,
    form_data: z.record(z.string(), z.unknown()),
    response: z.string().optional(),
    refined_prompt: z.string().optional(),
    chat_messages: z.array(chatMessageSchema).optional(),
}).strict()

export const updateSessionSchema = z.object({
    session_name: z.string().min(1).max(200).optional(),
    form_data: z.record(z.string(), z.unknown()).optional(),
    response: z.string().optional(),
    refined_prompt: z.string().optional(),
    chat_messages: z.array(chatMessageSchema).optional(),
}).strict()

// ============================================================================
// WORKFLOW/CANVAS SCHEMAS
// ============================================================================

export const stepInputMappingSchema = z.object({
    from_user: z.array(z.string()).optional(),
    from_steps: z.record(z.string(), z.array(z.string())).optional(),
    from_history: z.object({
        history_id: z.string(),
        session_strategy: z.enum(['use_latest', 'use_all', 'use_specific']),
        session_ids: z.array(z.string()).optional(),
    }).optional(),
    user_input_specs: z.array(z.object({
        field: z.string().min(1).max(100),
        label: z.string().min(1).max(200),
        type: z.enum(['text', 'image']),
    })).optional(),
}).strict()

export const workflowStepSchema = z.object({
    step_id: z.string().min(1).max(100),
    agent_id: agentTypeSchema,
    description: z.string().max(1000).optional(),
    depends_on: z.array(z.string()).optional(),
    input_mapping: stepInputMappingSchema.optional(),
    outputs: z.array(z.string()).optional(),
    position: z.object({
        x: z.number(),
        y: z.number(),
    }).optional(),
}).strict()

export const finalResponseStrategySchema = z.object({
    type: z.enum(['merge_and_summarize', 'concatenate', 'select_best', 'custom', 'last_step', 'specific_step']),
    from_steps: z.array(z.string()).optional(),
    specific_step: z.string().optional(),
    instructions: z.string().max(2000).optional(),
}).strict()

export const workflowPlanSchema = z.object({
    workflow_name: z.string().min(1).max(200),
    steps: z.array(workflowStepSchema),
    final_response_strategy: finalResponseStrategySchema.optional(),
}).strict()

export const createWorkflowSchema = z.object({
    name: z.string().min(1, 'Workflow name is required').max(200),
    description: z.string().max(2000).optional(),
    workflow_plan: workflowPlanSchema.optional(),
}).strict()

export const updateWorkflowSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    workflow_plan: workflowPlanSchema.optional(),
    status: z.enum(['draft', 'active', 'archived']).optional(),
}).strict()

export const orchestrateRequestSchema = z.object({
    user_input: z.string().min(1, 'User input is required').max(10000),
    context: z.record(z.string(), z.unknown()).optional(),
}).strict()

export const executeWorkflowSchema = z.object({
    user_inputs: z.record(z.string(), z.unknown()).optional(),
}).strict()

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const userRoleSchema = z.enum(['user', 'mod', 'admin'])

export const updateUserRoleSchema = z.object({
    role: userRoleSchema,
}).strict()

export const auditLogFilterSchema = z.object({
    userId: z.string().uuid().optional(),
    action: z.string().max(100).optional(),
    resourceType: z.string().max(100).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.number().min(1).max(1000).optional(),
    offset: z.number().min(0).optional(),
}).strict()

// ============================================================================
// FILE UPLOAD SCHEMAS
// ============================================================================

export const fileUploadSchema = z.object({
    filename: z.string().min(1).max(255)
        .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename characters'),
    mimetype: z.enum([
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'application/pdf',
    ]),
    size: z.number().max(10 * 1024 * 1024, 'File size must be under 10MB'),
}).strict()

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
    page: z.number().min(1).optional().default(1),
    limit: z.number().min(1).max(100).optional().default(20),
}).strict()

export const uuidSchema = z.string().uuid('Invalid ID format')

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export interface ZodIssue {
    path: (string | number | symbol)[]
    message: string
    code: string
}

export type ValidationResult<T> =
    | { success: true; data: T }
    | { success: false; errors: ZodIssue[] }

/**
 * Validate input against a Zod schema
 * Returns typed data or validation errors
 */
export function validateInput<T extends z.ZodSchema>(
    schema: T,
    data: unknown
): ValidationResult<z.infer<T>> {
    const result = schema.safeParse(data)

    if (result.success) {
        return { success: true, data: result.data }
    }

    // Convert Zod errors to our format
    const errors: ZodIssue[] = result.error.issues.map(issue => ({
        path: issue.path,
        message: issue.message,
        code: issue.code,
    }))

    return { success: false, errors }
}

/**
 * Format Zod errors into a user-friendly message
 */
export function formatValidationErrors(errors: ZodIssue[]): string {
    return errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ')
}

/**
 * Create a NextResponse for validation errors
 */
export function validationErrorResponse(errors: ZodIssue[]) {
    return {
        error: 'Validation failed',
        details: errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
        })),
    }
}

// Export types
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type AgentType = z.infer<typeof agentTypeSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type AgentChatInput = z.infer<typeof agentChatSchema>
export type CreateSessionInput = z.infer<typeof createSessionSchema>
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>
export type WorkflowPlan = z.infer<typeof workflowPlanSchema>
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>
export type UserRole = z.infer<typeof userRoleSchema>
export type FileUploadInput = z.infer<typeof fileUploadSchema>
