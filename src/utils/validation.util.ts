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

  fiscalYear: Joi.number().optional(),
  fiscalPeriod: Joi.string().optional(),
  createdByName: Joi.string().optional(),
  createdByRole: Joi.string().optional(),
  createdByEmail: Joi.string().email().optional(),
  status: Joi.string().valid('DRAFT', 'SUBMITTED').optional(),
  start_date: Joi.string().optional(),
  end_date: Joi.string().optional(),
  
  linkedPurchaseRequestId: Joi.number().optional(),
  linkedPurchaseRequestRefNo: Joi.string().optional(),
  
  items: Joi.array()
    .items(
      Joi.object({
        // Accept both naming conventions
        itemName: Joi.string().optional(),
        item_name: Joi.string().optional(),
        itemCode: Joi.string().optional(),
        item_code: Joi.string().optional(),
        quantity: Joi.number().positive().required(),
        unitCost: Joi.number().min(0).optional(),
        unit_cost: Joi.number().min(0).optional(),
        totalCost: Joi.number().min(0).optional(),
        subtotal: Joi.number().min(0).optional(),
        supplierId: Joi.string().optional(),
        supplier_id: Joi.string().optional(),
        supplierName: Joi.string().optional(),
        supplier: Joi.string().optional(),
        unit_measure: Joi.string().optional(),
        itemPriority: Joi.string().valid('must_have', 'should_have', 'nice_to_have').optional(),
        isEssential: Joi.boolean().optional()
      })
      // At least one name field is required
      .or('itemName', 'item_name')
      // At least one cost field is required
      .or('unitCost', 'unit_cost')
      // At least one total field is required
      .or('totalCost', 'subtotal')
    )
    .optional(),
  
  supporting_documents: Joi.array().optional()
}).unknown(true); // Allow additional fields

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
