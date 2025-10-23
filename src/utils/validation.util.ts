// src/utils/validation.util.ts
import Joi from 'joi';

export const budgetRequestSchema = Joi.object({
  department: Joi.string()
    .valid('finance', 'hr', 'inventory', 'operations')
    .required(),
  
  amountRequested: Joi.number()
    .positive()
    .max(10000000)
    .required(),
  
  purpose: Joi.string()
    .min(10)
    .max(500)
    .required(),
  
  justification: Joi.string()
    .max(5000)
    .optional(),
  
  category: Joi.string()
    .valid('operational', 'capital', 'administrative', 'emergency')
    .optional(),
  
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .optional(),
  
  urgencyReason: Joi.string()
    .max(1000)
    .optional(),
  
  linkedPurchaseRequestId: Joi.number().optional(),
  linkedPurchaseRequestRefNo: Joi.string().optional(),
  
  items: Joi.array()
    .items(
      Joi.object({
        itemName: Joi.string().required(),
        itemCode: Joi.string().optional(),
        quantity: Joi.number().positive().required(),
        unitCost: Joi.number().positive().required(),
        totalCost: Joi.number().positive().required(),
        supplierId: Joi.string().optional(),
        supplierName: Joi.string().optional(),
        itemPriority: Joi.string().valid('must_have', 'should_have', 'nice_to_have').optional(),
        isEssential: Joi.boolean().optional()
      })
    )
    .optional()
});

export function validateBudgetRequest(data: any) {
  return budgetRequestSchema.validate(data, { abortEarly: false });
}

export const approvalSchema = Joi.object({
  reviewNotes: Joi.string().min(10).max(2000).required(),
  reservedAmount: Joi.number().positive().optional(),
  bufferPercentage: Joi.number().min(0).max(50).optional()
});

export const rejectionSchema = Joi.object({
  reviewNotes: Joi.string().min(10).max(2000).required()
});
