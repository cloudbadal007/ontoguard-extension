/**
 * Demo scenarios — insurance-flavoured SHACL constraint checks.
 * Framed as structural checks, not solver-confirmed entailments.
 */

export interface DemoScenario {
  id: string;
  title: string;
  plainEnglishSetup: string;
  shapesTurtle: string;
  dataTurtle: string;
}

const conflictingShapes = `@prefix ex: <http://example.org/insurance#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .

ex:CoveredMustPayShape a sh:NodeShape ;
    sh:targetClass ex:CoveredClaim ;
    sh:property [
        sh:path ex:decision ;
        sh:hasValue ex:Paid ;
    ] .

ex:SiuHoldNoPayShape a sh:NodeShape ;
    sh:targetClass ex:SiuHoldClaim ;
    sh:property [
        sh:path ex:decision ;
        sh:hasValue ex:Held ;
        sh:message "Cannot pay — claim is under SIU investigation, but coverage rule also requires payment. Conflicting rules detected." ;
    ] .`;

const conflictingBlockingData = `@prefix ex: <http://example.org/insurance#> .

ex:claim2291 a ex:Claim, ex:CoveredClaim, ex:SiuHoldClaim ;
    ex:claimId "CL-2291" ;
    ex:decision ex:Paid .`;

const dutyPersistShapes = `@prefix ex: <http://example.org/insurance#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:MidPeriodLapsedPolicy a sh:NodeShape ;
    sh:property [
        sh:path ex:coverageLapsed ;
        sh:hasValue true ;
    ] ;
    sh:property [
        sh:path ex:benefitPeriodEnded ;
        sh:hasValue false ;
    ] .

ex:BenefitPaymentActionShape a sh:NodeShape ;
    sh:targetClass ex:BenefitPaymentAction ;
    sh:property [
        sh:path ex:subjectDuty ;
        sh:minCount 1 ;
        sh:node ex:DutySafeToPay ;
        sh:message "Benefit duty still marked active after coverage lapsed on day 12 of the benefit period. Flagging before payment is sent." ;
    ] .

ex:DutySafeToPay a sh:NodeShape ;
    sh:not [
        sh:and [
            sh:property [
                sh:path ex:dutyStatus ;
                sh:hasValue "active" ;
            ] ;
            sh:property [
                sh:path ex:policy ;
                sh:minCount 1 ;
                sh:node ex:MidPeriodLapsedPolicy ;
            ] ;
        ]
    ] ;
    sh:message "Benefit duty still marked active after coverage lapsed on day 12 of the benefit period. Flagging before payment is sent." .`;

const dutyPersistBlockingData = `@prefix ex: <http://example.org/insurance#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:pay2291 a ex:BenefitPaymentAction ;
    ex:subjectDuty ex:duty2291 .

ex:duty2291 a ex:BenefitDuty ;
    ex:dutyStatus "active" ;
    ex:policy ex:policy2291 .

ex:policy2291 a ex:Policy ;
    ex:policyId "PL-2291" ;
    ex:coverageLapseDay 12 ;
    ex:benefitPeriodDays 30 ;
    ex:coverageLapsed true ;
    ex:benefitPeriodEnded false .`;

const refundShapes = `@prefix ex: <http://example.org/insurance#> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:RefundUnderLimit a sh:NodeShape ;
    sh:property [
        sh:path ex:amount ;
        sh:datatype xsd:decimal ;
        sh:maxInclusive "50.00"^^xsd:decimal ;
    ] .

ex:RefundHasApproval a sh:NodeShape ;
    sh:property [
        sh:path ex:hasManagerApproval ;
        sh:minCount 1 ;
        sh:class ex:ManagerApproval ;
    ] .

ex:RefundApprovalShape a sh:NodeShape ;
    sh:targetClass ex:PremiumRefund ;
    sh:or (
        [ sh:node ex:RefundUnderLimit ]
        [ sh:node ex:RefundHasApproval ]
    ) ;
    sh:message "Premium refunds over $50 require manager approval — none found for this case." .`;

const refundBlockingData = `@prefix ex: <http://example.org/insurance#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:refund4521 a ex:PremiumRefund ;
    ex:amount "80.00"^^xsd:decimal ;
    ex:policyId "PL-4521" .`;

export const demoScenarios: DemoScenario[] = [
  {
    id: "conflicting-rules",
    title: "Covered Claim vs SIU Hold",
    plainEnglishSetup:
      "Two rules apply at once: a covered claim must be paid, and a claim under SIU investigation must not be paid. This case is both.",
    shapesTurtle: conflictingShapes,
    dataTurtle: conflictingBlockingData,
  },
  {
    id: "duty-persists",
    title: "Benefit That Won't Stop",
    plainEnglishSetup:
      "Coverage lapsed mid-benefit-period, but the duty-to-pay rule never ends mid-period — so benefit payments keep going out.",
    shapesTurtle: dutyPersistShapes,
    dataTurtle: dutyPersistBlockingData,
  },
  {
    id: "refund",
    title: "Premium Refund Approval",
    plainEnglishSetup:
      "An agent is about to issue an $80 premium refund. Policy: refunds over $50 need manager sign-off first.",
    shapesTurtle: refundShapes,
    dataTurtle: refundBlockingData,
  },
];
