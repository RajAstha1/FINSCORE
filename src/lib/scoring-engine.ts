// ═══════════════════════════════════════════════════════════════
// Arogya FinScore - Credit Scoring Engine
// Ensemble: XGBoost + CatBoost + Deep Forest (simulated)
// ═══════════════════════════════════════════════════════════════

export interface ScoringFeatures {
  age: number;
  monthlyIncome: number;
  loanAmount: number;
  loanTenure: number;
  repaymentHistory: number; // 0-100
  creditUtilization: number; // 0-100
  debtToIncome: number; // 0-100
  employmentStability: number; // 0-100 years*10
  educationLevel: number; // 0-5
  electricityConsistency: number; // 0-100
  mobileRechargeConsistency: number; // 0-100
  utilityPaymentHistory: number; // 0-100
  accountAge: number; // years
  stateRiskFactor: number; // 0-100
  categoryFactor: number; // 0-100
  previousLoans: number;
  previousDefaults: number;
}

export interface SHAPValue {
  feature: string;
  value: number;
  shapValue: number;
 direction: 'positive' | 'negative';
}

export interface ScoringResult {
  totalScore: number;
  confidenceScore: number;
  riskGrade: string;
  xgboostScore: number;
  catboostScore: number;
  deepForestScore: number;
  repaymentScore: number;
  consumptionScore: number;
  shapValues: SHAPValue[];
  featureWeights: Record<string, number>;
  decisionType: 'auto_approve' | 'manual_review' | 'reject';
  decisionReason: string;
}

// Feature definitions with display names
export const FEATURE_LABELS: Record<string, string> = {
  age: 'Age',
  monthlyIncome: 'Monthly Income',
  loanAmount: 'Loan Amount',
  loanTenure: 'Loan Tenure',
  repaymentHistory: 'Repayment History',
  creditUtilization: 'Credit Utilization',
  debtToIncome: 'Debt-to-Income Ratio',
  employmentStability: 'Employment Stability',
  educationLevel: 'Education Level',
  electricityConsistency: 'Electricity Payment',
  mobileRechargeConsistency: 'Mobile Recharge',
  utilityPaymentHistory: 'Utility Payments',
  accountAge: 'Bank Account Age',
  stateRiskFactor: 'State Risk Factor',
  categoryFactor: 'Category Factor',
  previousLoans: 'Previous Loans',
  previousDefaults: 'Previous Defaults',
};

// XGBoost simulation (gradient boosted trees)
function xgboostPredict(features: ScoringFeatures): number {
  const { monthlyIncome, repaymentHistory, creditUtilization, debtToIncome, employmentStability, previousDefaults } = features;
  
  // Weighted linear combination + non-linear interactions (simulating tree ensemble)
  let score = 0;
  score += Math.min(monthlyIncome / 50000, 1) * 22;
  score += (repaymentHistory / 100) * 20;
  score += ((100 - creditUtilization) / 100) * 12;
  score += ((100 - debtToIncome) / 100) * 15;
  score += (employmentStability / 100) * 10;
  score -= previousDefaults * 12;
  score += (features.educationLevel / 5) * 4;
  score += Math.min(features.accountAge / 10, 1) * 5;
  
  // Non-linear interaction terms
  if (monthlyIncome > 20000 && repaymentHistory > 70) score += 5;
  if (debtToIncome < 40 && employmentStability > 60) score += 3;
  if (previousDefaults > 2) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

// CatBoost simulation (categorical-boosted trees)
function catboostPredict(features: ScoringFeatures): number {
  let score = 0;
  score += Math.min(features.monthlyIncome / 40000, 1) * 20;
  score += (features.repaymentHistory / 100) * 18;
  score += (features.electricityConsistency / 100) * 10;
  score += (features.mobileRechargeConsistency / 100) * 8;
  score += (features.utilityPaymentHistory / 100) * 7;
  score += ((100 - features.debtToIncome) / 100) * 13;
  score += (features.employmentStability / 100) * 9;
  score += (features.educationLevel / 5) * 5;
  score -= features.previousDefaults * 10;
  score += Math.min(features.accountAge / 8, 1) * 5;
  
  // Categorical feature interactions (simulating CatBoost's strength)
  const catBoost = (features.stateRiskFactor < 50 ? 3 : 0) + 
                    (features.categoryFactor < 60 ? 2 : 0);
  score += catBoost;
  
  return Math.max(0, Math.min(100, score));
}

// Deep Forest simulation (cascading forest)
function deepForestPredict(features: ScoringFeatures): number {
  let score = 0;
  
  // Layer 1: Individual feature contributions
  const layer1 = [
    Math.min(features.monthlyIncome / 45000, 1) * 21,
    (features.repaymentHistory / 100) * 19,
    ((100 - features.creditUtilization) / 100) * 11,
    ((100 - features.debtToIncome) / 100) * 14,
    (features.employmentStability / 100) * 11,
    (features.electricityConsistency / 100) * 6,
    (features.mobileRechargeConsistency / 100) * 5,
    (features.utilityPaymentHistory / 100) * 5,
    (features.educationLevel / 5) * 4,
    Math.min(features.accountAge / 9, 1) * 4,
  ].reduce((a, b) => a + b, 0);
  
  // Layer 2: Feature interactions (cascading)
  const incomeStability = Math.min(features.monthlyIncome / 30000, 1) * (features.employmentStability / 100);
  const paymentReliability = (features.repaymentHistory + features.electricityConsistency + features.mobileRechargeConsistency) / 300;
  
  score = layer1 * 0.7 + (incomeStability * 15 + paymentReliability * 15) * 0.3;
  score -= features.previousDefaults * 11;
  
  return Math.max(0, Math.min(100, score));
}

// Generate SHAP values for explainability
function generateSHAPValues(features: ScoringFeatures, baseScore: number, finalScore: number): SHAPValue[] {
  const values: SHAPValue[] = [];
  const diff = finalScore - baseScore;
  
  // Calculate each feature's contribution
  const featureContributions: [string, number][] = [
    ['repaymentHistory', (features.repaymentHistory - 60) * 0.18],
    ['monthlyIncome', (Math.min(features.monthlyIncome / 40000, 1) - 0.4) * 18],
    ['debtToIncome', (50 - features.debtToIncome) * 0.12],
    ['employmentStability', (features.employmentStability - 50) * 0.08],
    ['creditUtilization', (50 - features.creditUtilization) * 0.1],
    ['electricityConsistency', (features.electricityConsistency - 50) * 0.07],
    ['mobileRechargeConsistency', (features.mobileRechargeConsistency - 50) * 0.05],
    ['utilityPaymentHistory', (features.utilityPaymentHistory - 50) * 0.04],
    ['educationLevel', (features.educationLevel - 2) * 1.5],
    ['accountAge', (Math.min(features.accountAge, 10) - 5) * 0.4],
    ['previousDefaults', -features.previousDefaults * 5],
    ['previousLoans', Math.min(features.previousLoans, 5) * 0.8],
    ['stateRiskFactor', (50 - features.stateRiskFactor) * 0.03],
    ['categoryFactor', (50 - features.categoryFactor) * 0.03],
    ['loanAmount', (100000 - features.loanAmount) / 100000 * 3],
    ['loanTenure', (36 - features.loanTenure) / 36 * 2],
  ];
  
  // Normalize to match diff
  const totalAbsContribution = featureContributions.reduce((sum, [, v]) => sum + Math.abs(v), 0);
  
  for (const [feature, contribution] of featureContributions) {
    const normalizedContribution = totalAbsContribution > 0 
      ? (contribution / totalAbsContribution) * Math.abs(diff)
      : 0;
    
    values.push({
      feature,
      value: features[feature as keyof ScoringFeatures],
      shapValue: Math.round(normalizedContribution * 100) / 100,
      direction: normalizedContribution >= 0 ? 'positive' : 'negative',
    });
  }
  
  // Sort by absolute SHAP value descending
  values.sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue));
  
  return values;
}

// Main scoring function
export function scoreApplication(features: ScoringFeatures): ScoringResult {
  // Run ensemble models
  const xgboostScore = xgboostPredict(features);
  const catboostScore = catboostPredict(features);
  const deepForestScore = deepForestPredict(features);
  
  // Weighted ensemble (XGBoost: 40%, CatBoost: 35%, DeepForest: 25%)
  const totalScore = Math.round(
    xgboostScore * 0.4 + catboostScore * 0.35 + deepForestScore * 0.25
  );
  
  // Calculate confidence (agreement between models)
  const scores = [xgboostScore, catboostScore, deepForestScore];
  const mean = scores.reduce((a, b) => a + b, 0) / 3;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / 3;
  const stdDev = Math.sqrt(variance);
  const confidenceScore = Math.round(Math.max(0, Math.min(100, 100 - stdDev * 3)));
  
  // Determine risk grade
  let riskGrade: string;
  if (totalScore >= 82) riskGrade = 'A+';
  else if (totalScore >= 72) riskGrade = 'A';
  else if (totalScore >= 62) riskGrade = 'B+';
  else if (totalScore >= 50) riskGrade = 'B';
  else if (totalScore >= 38) riskGrade = 'C+';
  else if (totalScore >= 25) riskGrade = 'C';
  else riskGrade = 'D';
  
  // Calculate sub-scores
  const repaymentScore = Math.round(
    (features.repaymentHistory * 0.5 + (100 - features.creditUtilization) * 0.2 + 
     (100 - features.debtToIncome) * 0.2 + features.employmentStability * 0.1)
  );
  
  const consumptionScore = Math.round(
    (features.electricityConsistency * 0.4 + features.mobileRechargeConsistency * 0.3 + 
     features.utilityPaymentHistory * 0.3)
  );
  
  // Generate SHAP values
  const shapValues = generateSHAPValues(features, 50, totalScore);
  
  // Calculate feature weights for the ensemble
  const featureWeights: Record<string, number> = {};
  const totalSHAPAbs = shapValues.reduce((sum, v) => sum + Math.abs(v.shapValue), 0);
  for (const sv of shapValues) {
    featureWeights[sv.feature] = totalSHAPAbs > 0 ? Math.round((Math.abs(sv.shapValue) / totalSHAPAbs) * 100) : 0;
  }
  
  // Decision logic
  let decisionType: ScoringResult['decisionType'];
  let decisionReason: string;
  
  if (totalScore >= 65 && confidenceScore >= 60 && features.previousDefaults < 2) {
    decisionType = 'auto_approve';
    decisionReason = `Score ${totalScore} (Grade ${riskGrade}) exceeds auto-approval threshold with ${confidenceScore}% model confidence.`;
  } else if (totalScore >= 35) {
    decisionType = 'manual_review';
    decisionReason = totalScore < 50 
      ? `Score ${totalScore} (Grade ${riskGrade}) below auto-approval threshold. Requires analyst review.`
      : `Score ${totalScore} (Grade ${riskGrade}) but confidence ${confidenceScore}% is below threshold. Manual review required.`;
  } else {
    decisionType = 'reject';
    decisionReason = `Score ${totalScore} (Grade ${riskGrade}) below minimum threshold. High default risk indicated.`;
  }
  
  return {
    totalScore,
    confidenceScore,
    riskGrade,
    xgboostScore: Math.round(xgboostScore * 10) / 10,
    catboostScore: Math.round(catboostScore * 10) / 10,
    deepForestScore: Math.round(deepForestScore * 10) / 10,
    repaymentScore,
    consumptionScore,
    shapValues,
    featureWeights,
    decisionType,
    decisionReason,
  };
}

// Generate default features from beneficiary data
export function generateFeaturesFromData(data: {
  age?: number;
  monthlyIncome?: number;
  loanAmount?: number;
  loanTenure?: number;
  repaymentHistory?: number;
  electricityConsistency?: number;
  mobileRechargeConsistency?: number;
  utilityPaymentHistory?: number;
  previousLoans?: number;
  previousDefaults?: number;
  educationLevel?: string;
  accountAge?: number;
  state?: string;
  category?: string;
}): ScoringFeatures {
  const eduMap: Record<string, number> = {
    'illiterate': 0, 'primary': 1, 'secondary': 2, 'higher_secondary': 3, 
    'graduate': 4, 'postgraduate': 5, '': 2
  };
  
  const stateRisk: Record<string, number> = {
    'Maharashtra': 35, 'Karnataka': 30, 'Tamil Nadu': 32, 'Gujarat': 28,
    'Rajasthan': 50, 'MP': 55, 'UP': 58, 'Bihar': 65, 'Jharkhand': 60,
    'Odisha': 52, 'West Bengal': 48, '': 45,
  };
  
  const catRisk: Record<string, number> = {
    'SC': 55, 'ST': 50, 'OBC': 45, 'General': 35, '': 45,
  };
  
  return {
    age: data.age || 35,
    monthlyIncome: data.monthlyIncome || 15000,
    loanAmount: data.loanAmount || 50000,
    loanTenure: data.loanTenure || 24,
    repaymentHistory: data.repaymentHistory || 60,
    creditUtilization: data.repaymentHistory ? 100 - data.repaymentHistory : 45,
    debtToIncome: data.monthlyIncome ? Math.min(40, (data.loanAmount / (data.monthlyIncome * data.loanTenure || 12)) * 100) : 40,
    employmentStability: data.age ? Math.min(100, (data.age - 20) * 5) : 50,
    educationLevel: eduMap[data.educationLevel || ''] || 2,
    electricityConsistency: data.electricityConsistency || 55,
    mobileRechargeConsistency: data.mobileRechargeConsistency || 70,
    utilityPaymentHistory: data.utilityPaymentHistory || 50,
    accountAge: data.accountAge || 3,
    stateRiskFactor: stateRisk[data.state || ''] || 45,
    categoryFactor: catRisk[data.category || ''] || 45,
    previousLoans: data.previousLoans || 1,
    previousDefaults: data.previousDefaults || 0,
  };
}
