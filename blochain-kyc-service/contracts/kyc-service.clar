;; Define error constants
(define-constant err-unauthorized (err u100))
(define-constant err-already-exists (err u101))
(define-constant err-not-found (err u102))
(define-constant err-already-verified (err u103))
(define-constant err-invalid-kyc-level (err u104))
(define-constant err-document-already-exists (err u105))
;; Additional error constants
(define-constant err-invalid-date (err u106))
(define-constant err-invalid-status (err u107))
(define-constant err-expired (err u108))
(define-constant err-max-documents (err u109))


;; Define data variables
(define-data-var contract-owner principal tx-sender)
(define-data-var customer-id-nonce uint u0)
(define-data-var business-id-nonce uint u0)

;; Define maps
(define-map customers 
  { customer-id: uint }
  {
    address: principal,
    name: (string-utf8 100),
    date-of-birth: uint,
    residence-country: (string-utf8 50),
    is-verified: bool,
    verification-date: uint,
    kyc-level: uint  ;; New field for KYC level
  }
)
(define-map businesses
  { business-id: uint }
  {
    address: principal,
    name: (string-utf8 100),
    is-approved: bool,
    business-type: (string-utf8 50)  ;; New field for business type
  }
)
(define-map customer-documents
  { customer-id: uint, document-type: (string-utf8 50) }
  {
    document-hash: (buff 32),
    upload-date: uint
  }
)

;; Additional data maps
(define-map document-types
    (string-utf8 50)
    {
        required-kyc-level: uint,
        expiry-period: uint,  ;; in blocks
        is-active: bool
    }
)

(define-map customer-status-history
    { customer-id: uint }
    (list 20 {
        timestamp: uint,
        old-status: bool,
        new-status: bool,
        changed-by: principal
    })
)

(define-map business-customers
    { business-id: uint }
    (list 1000 uint)  ;; List of customer IDs
)



;; Helper functions
(define-private (is-contract-owner)
  (is-eq tx-sender (var-get contract-owner))
)

(define-private (is-approved-business (business-id uint))
  (match (map-get? businesses { business-id: business-id })
    business (get is-approved business)
    false
  )
)

;; Public functions
(define-public (add-customer (name (string-utf8 100)) (date-of-birth uint) (residence-country (string-utf8 50)))
  (let
    (
      (new-id (+ (var-get customer-id-nonce) u1))
    )
    (asserts! (is-none (map-get? customers { customer-id: new-id })) err-already-exists)
    (map-set customers
      { customer-id: new-id }
      {
        address: tx-sender,
        name: name,
        date-of-birth: date-of-birth,
        residence-country: residence-country,
        is-verified: false,
        verification-date: u0,
        kyc-level: u0
      }
    )
    (var-set customer-id-nonce new-id)
    (ok new-id)
  )
)

(define-public (verify-customer (customer-id uint) (business-id uint))
  (let
    (
      (customer (unwrap! (map-get? customers { customer-id: customer-id }) err-not-found))
    )
    (asserts! (is-approved-business business-id) err-unauthorized)
    (asserts! (not (get is-verified customer)) err-already-verified)
    (map-set customers
      { customer-id: customer-id }
      (merge customer { 
        is-verified: true,
        verification-date: block-height
      })
    )
    (ok true)
  )
)

(define-public (approve-business (address principal) (name (string-utf8 100)) (business-type (string-utf8 50)))
  (let
    (
      (new-id (+ (var-get business-id-nonce) u1))
    )
    (asserts! (is-contract-owner) err-unauthorized)
    (asserts! (is-none (map-get? businesses { business-id: new-id })) err-already-exists)
    (map-set businesses
      { business-id: new-id }
      {
        address: address,
        name: name,
        is-approved: true,
        business-type: business-type
      }
    )
    (var-set business-id-nonce new-id)
    (ok new-id)
  )
)

(define-public (revoke-business (business-id uint))
  (let
    (
      (business (unwrap! (map-get? businesses { business-id: business-id }) err-not-found))
    )
    (asserts! (is-contract-owner) err-unauthorized)
    (map-set businesses
      { business-id: business-id }
      (merge business { is-approved: false })
    )
    (ok true)
  )
)


(define-public (update-kyc-level (customer-id uint) (new-kyc-level uint))
  (let
    (
      (customer (unwrap! (map-get? customers { customer-id: customer-id }) err-not-found))
    )
    (asserts! (is-contract-owner) err-unauthorized)
    (asserts! (or (is-eq new-kyc-level u1) (is-eq new-kyc-level u2) (is-eq new-kyc-level u3)) err-invalid-kyc-level)
    (map-set customers
      { customer-id: customer-id }
      (merge customer { kyc-level: new-kyc-level })
    )
    (ok true)
  )
)

(define-public (upload-customer-document (customer-id uint) (document-type (string-utf8 50)) (document-hash (buff 32)))
  (let
    (
      (customer (unwrap! (map-get? customers { customer-id: customer-id }) err-not-found))
    )
    (asserts! (is-eq tx-sender (get address customer)) err-unauthorized)
    (asserts! (is-none (map-get? customer-documents { customer-id: customer-id, document-type: document-type })) err-document-already-exists)
    (map-set customer-documents
      { customer-id: customer-id, document-type: document-type }
      {
        document-hash: document-hash,
        upload-date: block-height
      }
    )
    (ok true)
  )
)

;; Initialize document types
(define-public (register-document-type 
    (doc-type (string-utf8 50)) 
    (required-level uint) 
    (expiry-blocks uint))
    (begin
        (asserts! (is-contract-owner) err-unauthorized)
        (ok (map-set document-types doc-type {
            required-kyc-level: required-level,
            expiry-period: expiry-blocks,
            is-active: true
        }))
    )
)

;; Deactivate document type
(define-public (deactivate-document-type (doc-type (string-utf8 50)))
    (begin
        (asserts! (is-contract-owner) err-unauthorized)
        (match (map-get? document-types doc-type)
            doc-info (ok (map-set document-types 
                doc-type 
                (merge doc-info { is-active: false })))
            err-not-found
        )
    )
)

;; Update customer verification with history
(define-public (update-customer-verification 
    (customer-id uint) 
    (business-id uint) 
    (new-status bool))
    (let
        (
            (customer (unwrap! (map-get? customers { customer-id: customer-id }) err-not-found))
            (current-status (get is-verified customer))
        )
        (begin
            (asserts! (is-approved-business business-id) err-unauthorized)
            (asserts! (not (is-eq current-status new-status)) err-invalid-status)
            
            ;; Update customer status
            (map-set customers
                { customer-id: customer-id }
                (merge customer { 
                    is-verified: new-status,
                    verification-date: block-height
                })
            )
            
            ;; Add to history
            (match (map-get? customer-status-history { customer-id: customer-id })
                prev-history (map-set customer-status-history
                    { customer-id: customer-id }
                    (unwrap! (as-max-len? 
                        (append prev-history {
                            timestamp: block-height,
                            old-status: current-status,
                            new-status: new-status,
                            changed-by: tx-sender
                        }) 
                        u20) 
                        err-unauthorized))
                (map-set customer-status-history
                    { customer-id: customer-id }
                    (list {
                        timestamp: block-height,
                        old-status: current-status,
                        new-status: new-status,
                        changed-by: tx-sender
                    })
                )
            )
            
            (ok true)
        )
    )
)

;; Link customer to business
(define-public (link-customer-to-business 
    (customer-id uint) 
    (business-id uint))
    (begin
        (asserts! (is-approved-business business-id) err-unauthorized)
        (match (map-get? business-customers { business-id: business-id })
            prev-customers (ok (map-set business-customers
                { business-id: business-id }
                (unwrap! (as-max-len? 
                    (append prev-customers customer-id)
                    u1000)
                    err-unauthorized)))
            (ok (map-set business-customers
                { business-id: business-id }
                (list customer-id)))
        )
    )
)


;; Read-only functions
(define-read-only (get-customer-details (customer-id uint))
  (map-get? customers { customer-id: customer-id })
)

(define-read-only (is-customer-verified (customer-id uint))
  (match (map-get? customers { customer-id: customer-id })
    customer (get is-verified customer)
    false
  )
)

(define-read-only (is-business-approved (business-id uint))
  (is-approved-business business-id)
)

(define-read-only (get-customer-kyc-level (customer-id uint))
  (match (map-get? customers { customer-id: customer-id })
    customer (some (get kyc-level customer))
    none
  )
)

(define-read-only (get-customer-document (customer-id uint) (document-type (string-utf8 50)))
  (map-get? customer-documents { customer-id: customer-id, document-type: document-type })
)

(define-read-only (get-business-details (business-id uint))
  (map-get? businesses { business-id: business-id })
)

;; Get customer verification history
(define-read-only (get-customer-verification-history (customer-id uint))
    (map-get? customer-status-history { customer-id: customer-id })
)

;; Get business customers
(define-read-only (get-business-customers (business-id uint))
    (map-get? business-customers { business-id: business-id })
)

;; Check if document type is active
(define-read-only (get-document-type-info (doc-type (string-utf8 50)))
    (map-get? document-types doc-type)
)

;; Get count of customer documents
(define-read-only (get-customer-document-count (customer-id uint))
    (let
        (
            (customer (unwrap! (map-get? customers { customer-id: customer-id }) u0))
        )
        (len (unwrap! (get-business-customers customer-id) u0))
    )
)

