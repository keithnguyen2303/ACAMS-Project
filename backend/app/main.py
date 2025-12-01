from typing import List
import bcrypt
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from app.core.config import settings
from app.deps import get_db
from app.models import UserRole, RequestStatus, AnimalStatus
from app.schemas import AnimalOut, UserCreate, UserOut, AdoptionRequestCreate, AdoptionRequestOut, AdoptionRequestStatusUpdate, LoginRequest, LoginResponse, MedicalRecordOut, IntakeRecordOut
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title=settings.PROJECT_NAME, version=settings.PROJECT_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a user by email and password.
    - If email not found or password mismatch -> HTTP 401
    - On success -> return user info WITHOUT password
    """
    sql = text("""
        SELECT
            u_userid  AS "U_USERID",
            u_name    AS "U_NAME",
            u_email   AS "U_EMAIL",
            u_role    AS "U_ROLE",
            u_password
        FROM app_user
        WHERE u_email = :email
        LIMIT 1
    """)
    result = db.execute(sql, {"email": payload.email})
    row = result.mappings().first()

    if not row:
        # email not found
        raise HTTPException(status_code=401, detail="Invalid email or password")

    stored_password = row["u_password"]
    input_password = payload.password.encode('utf-8')
    
    # Check if stored password is a bcrypt hash (starts with $2b$, $2a$, or $2y$)
    HASH_PREFIXES = ("$2b$", "$2a$", "$2y$")
    is_hashed = stored_password.startswith(HASH_PREFIXES)

    if is_hashed:
        # Verify hash
        if not bcrypt.checkpw(input_password, stored_password.encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid email or password")
    else:
        # Legacy plaintext check
        if stored_password != payload.password:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Migrate to bcrypt
        hashed = bcrypt.hashpw(input_password, bcrypt.gensalt()).decode('utf-8')
        update_sql = text("""
            UPDATE app_user
            SET u_password = :hashed_password
            WHERE u_userid = :user_id
        """)
        db.execute(update_sql, {"hashed_password": hashed, "user_id": row["U_USERID"]})
        db.commit()

    # Build a dict without the password for the response
    safe_row = {
        "U_USERID": row["U_USERID"],
        "U_NAME": row["U_NAME"],
        "U_EMAIL": row["U_EMAIL"],
        "U_ROLE": row["U_ROLE"],
    }

    return LoginResponse.model_validate(safe_row)

@app.get("/")
def read_root():
    return {"message": "Welcome to ACAMS Backend"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/animals", response_model=List[AnimalOut])
def get_animals(db: Session = Depends(get_db)):
    sql = text("""
        SELECT
            a_animalid  AS "A_ANIMALID",
            a_name      AS "A_NAME",
            a_species   AS "A_SPECIES",
            a_breed     AS "A_BREED",
            a_status    AS "A_STATUS",
            a_intakedate AS "A_INTAKEDATE"
        FROM animal
    """)
    result = db.execute(sql)
    rows = result.mappings().all()
    return [AnimalOut.model_validate(row) for row in rows]

@app.get("/animals/search", response_model=List[AnimalOut])
def search_animals(
    species: str | None = None,
    status: AnimalStatus | None = None,
    name_contains: str | None = None,
    db: Session = Depends(get_db),
):
    base_sql = """
        SELECT
            a_animalid  AS "A_ANIMALID",
            a_name      AS "A_NAME",
            a_species   AS "A_SPECIES",
            a_breed     AS "A_BREED",
            a_status    AS "A_STATUS",
            a_intakedate AS "A_INTAKEDATE"
        FROM animal
    """
    conditions = []
    params: dict = {}

    if species is not None:
        conditions.append("a_species = :species")
        params["species"] = species

    if status is not None:
        conditions.append("a_status = :status")
        params["status"] = status.value

    if name_contains is not None:
        conditions.append("a_name ILIKE '%' || :name || '%'")
        params["name"] = name_contains

    if conditions:
        base_sql += " WHERE " + " AND ".join(conditions)

    sql = text(base_sql)
    result = db.execute(sql, params)
    rows = result.mappings().all()
    return [AnimalOut.model_validate(row) for row in rows]


@app.get("/users", response_model=List[UserOut])
def get_users(db: Session = Depends(get_db)):
    sql = text("""
        SELECT
            u_userid AS "U_USERID",
            u_name   AS "U_NAME",
            u_email  AS "U_EMAIL",
            u_role   AS "U_ROLE"
        FROM app_user
    """)
    result = db.execute(sql)
    rows = result.mappings().all()
    return [UserOut.model_validate(row) for row in rows]

@app.get("/users/by-role", response_model=List[UserOut])
def get_users_by_role(role: UserRole, db: Session = Depends(get_db)):
    role_str = role.value
    sql = text("""
        SELECT
            u_userid AS "U_USERID",
            u_name   AS "U_NAME",
            u_email  AS "U_EMAIL",
            u_role   AS "U_ROLE"
        FROM app_user
        WHERE u_role = :role
    """)
    result = db.execute(sql, {"role": role_str})
    rows = result.mappings().all()
    return [UserOut.model_validate(row) for row in rows]

@app.post("/users", response_model=UserOut)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Hash the password
    hashed_password = bcrypt.hashpw(user.U_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    sql = text("""
        INSERT INTO app_user (u_name, u_email, u_password, u_role)
        VALUES (:name, :email, :password, :role)
        RETURNING
            u_userid AS "U_USERID",
            u_name   AS "U_NAME",
            u_email  AS "U_EMAIL",
            u_role   AS "U_ROLE"
    """)
    params = {
        "name": user.U_NAME,
        "email": user.U_EMAIL,
        "password": hashed_password,
        "role": user.U_ROLE.value
    }
    try:
        result = db.execute(sql, params)
        row = result.mappings().one()
        db.commit()
    except IntegrityError:
        db.rollback()
        # likely unique violation on u_email
        raise HTTPException(
            status_code=400,
            detail="Email is already registered",
        )
        
    return UserOut.model_validate(row)

@app.get("/adoption-requests", response_model=List[AdoptionRequestOut])
def get_adoption_requests(db: Session = Depends(get_db)):
    sql = text("""
        SELECT
            ar_userid    AS "AR_USERID",
            ar_animalid  AS "AR_ANIMALID",
            ar_status    AS "AR_STATUS",
            ar_createdat AS "AR_CREATEDAT",
            ar_updatedat AS "AR_UPDATEDAT"
        FROM adoption_request
    """)
    result = db.execute(sql)
    rows = result.mappings().all()
    return [AdoptionRequestOut.model_validate(row) for row in rows]

@app.post("/adoption-requests", response_model=AdoptionRequestOut)
def create_adoption_request(request: AdoptionRequestCreate, db: Session = Depends(get_db)):
    # Verify user exists and is an Adopter
    user_result = db.execute(
        text("SELECT * FROM app_user WHERE u_userid = :user_id"),
        {"user_id": request.AR_USERID}
    )
    user_row = user_result.mappings().first()
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found")
    if user_row["u_role"] != UserRole.Adopter.value:
        raise HTTPException(status_code=400, detail="User must be an Adopter")
    
    # Verify animal exists
    animal_result = db.execute(
        text("SELECT * FROM animal WHERE a_animalid = :animal_id"),
        {"animal_id": request.AR_ANIMALID}
    )
    animal_row = animal_result.mappings().first()
    if not animal_row:
        raise HTTPException(status_code=404, detail="Animal not found")
    
    # Ensure animal is adoptable
    if animal_row["a_status"] != AnimalStatus.Adoptable.value:
        raise HTTPException(status_code=400, detail="Animal is not adoptable")
    
    # Check for existing active requests
    active_statuses = [RequestStatus.Submitted.value, RequestStatus.Under_Review.value]
    existing_result = db.execute(
        text("""
            SELECT 1
            FROM adoption_request
            WHERE ar_userid = :user_id
              AND ar_animalid = :animal_id
              AND ar_status IN (:s1, :s2)
            LIMIT 1
        """),
        {
            "user_id": request.AR_USERID,
            "animal_id": request.AR_ANIMALID,
            "s1": active_statuses[0],
            "s2": active_statuses[1]
        }
    )
    if existing_result.first():
        raise HTTPException(status_code=400, detail="Active adoption request already exists")
    
    # Insert new adoption request
    insert_sql = text("""
        INSERT INTO adoption_request (ar_userid, ar_animalid, ar_status)
        VALUES (:user_id, :animal_id, :status)
        RETURNING
            ar_userid    AS "AR_USERID",
            ar_animalid  AS "AR_ANIMALID",
            ar_status    AS "AR_STATUS",
            ar_createdat AS "AR_CREATEDAT",
            ar_updatedat AS "AR_UPDATEDAT"
    """)
    insert_params = {
        "user_id": request.AR_USERID,
        "animal_id": request.AR_ANIMALID,
        "status": RequestStatus.Submitted.value
    }
    result = db.execute(insert_sql, insert_params)
    row = result.mappings().one()
    db.commit()
    return AdoptionRequestOut.model_validate(row)

@app.get("/adoption-requests/user/{user_id}", response_model=List[AdoptionRequestOut])
def get_user_adoption_requests(user_id: int, db: Session = Depends(get_db)):
    sql = text("""
        SELECT
            ar_userid    AS "AR_USERID",
            ar_animalid  AS "AR_ANIMALID",
            ar_status    AS "AR_STATUS",
            ar_createdat AS "AR_CREATEDAT",
            ar_updatedat AS "AR_UPDATEDAT"
        FROM adoption_request
        WHERE ar_userid = :user_id
    """)
    result = db.execute(sql, {"user_id": user_id})
    rows = result.mappings().all()
    return [AdoptionRequestOut.model_validate(row) for row in rows]

@app.delete("/adoption-requests/{user_id}/{animal_id}", response_model=AdoptionRequestOut)
def delete_adoption_request(
    user_id: int,
    animal_id: int,
    staff_user_id: int,
    db: Session = Depends(get_db),
):
    # Verify staff user authorization
    staff_result = db.execute(
        text("SELECT u_role FROM app_user WHERE u_userid = :staff_id"),
        {"staff_id": staff_user_id}
    )
    staff_row = staff_result.mappings().first()
    if not staff_row:
        raise HTTPException(status_code=404, detail="Staff user not found")
    if staff_row["u_role"] != UserRole.Staff.value:
        raise HTTPException(
            status_code=403,
            detail="User is not authorized to delete adoption requests"
        )
    
    # Load the request in the same shape as the output schema
    select_sql = text("""
        SELECT
            ar_userid    AS "AR_USERID",
            ar_animalid  AS "AR_ANIMALID",
            ar_status    AS "AR_STATUS",
            ar_createdat AS "AR_CREATEDAT",
            ar_updatedat AS "AR_UPDATEDAT"
        FROM adoption_request
        WHERE ar_userid = :user_id AND ar_animalid = :animal_id
    """)
    result = db.execute(select_sql, {"user_id": user_id, "animal_id": animal_id})
    row = result.mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Adoption request not found")

    # Only allow deleting already-closed requests 
    current_status = RequestStatus(row["AR_STATUS"])
    if current_status not in [RequestStatus.Cancelled, RequestStatus.Rejected]:
        raise HTTPException(
            status_code=400,
            detail="Only Cancelled or Rejected requests can be deleted",
        )

    # Perform the delete
    db.execute(
        text("""
            DELETE FROM adoption_request
            WHERE ar_userid = :user_id AND ar_animalid = :animal_id
        """),
        {"user_id": user_id, "animal_id": animal_id},
    )
    db.commit()
    return AdoptionRequestOut.model_validate(row)

@app.patch("/adoption-requests/{user_id}/{animal_id}/cancel", response_model=AdoptionRequestOut)
def cancel_adoption_request(
    user_id: int,
    animal_id: int,
    db: Session = Depends(get_db)
):
    # Load adoption request
    result = db.execute(
        text("SELECT * FROM adoption_request WHERE ar_userid = :user_id AND ar_animalid = :animal_id"),
        {"user_id": user_id, "animal_id": animal_id}
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Adoption request not found")
    
    # Work with enums safely
    current_status = RequestStatus(row["ar_status"])
    
    # Only allow cancellation if status is Submitted or Under_Review
    if current_status not in [RequestStatus.Submitted, RequestStatus.Under_Review]:
        raise HTTPException(status_code=400, detail="Cannot cancel this adoption request")
    
    # Cancel the request
    db.execute(
        text("""
            UPDATE adoption_request
            SET ar_status = :cancelled_status, ar_updatedat = NOW()
            WHERE ar_userid = :user_id AND ar_animalid = :animal_id
        """),
        {
            "cancelled_status": RequestStatus.Cancelled.value,
            "user_id": user_id,
            "animal_id": animal_id
        }
    )
    db.commit()
    
    # Re-select and return the updated row
    result = db.execute(
        text("""
            SELECT
                ar_userid    AS "AR_USERID",
                ar_animalid  AS "AR_ANIMALID",
                ar_status    AS "AR_STATUS",
                ar_createdat AS "AR_CREATEDAT",
                ar_updatedat AS "AR_UPDATEDAT"
            FROM adoption_request
            WHERE ar_userid = :user_id AND ar_animalid = :animal_id
        """),
        {"user_id": user_id, "animal_id": animal_id}
    )
    updated_row = result.mappings().one()
    return AdoptionRequestOut.model_validate(updated_row)

@app.patch("/adoption-requests/{user_id}/{animal_id}/status", response_model=AdoptionRequestOut)
def update_adoption_request_status(
    user_id: int,
    animal_id: int,
    staff_user_id: int,
    update: AdoptionRequestStatusUpdate,
    db: Session = Depends(get_db)
):
    # Verify staff user
    staff_result = db.execute(
        text("SELECT u_role FROM app_user WHERE u_userid = :staff_id"),
        {"staff_id": staff_user_id}
    )
    staff_row = staff_result.mappings().first()
    if not staff_row:
        raise HTTPException(status_code=404, detail="Staff user not found")
    if staff_row["u_role"] != UserRole.Staff.value:
        raise HTTPException(status_code=403, detail="User is not authorized to update adoption requests")
    
    # Load adoption request
    request_result = db.execute(
        text("SELECT * FROM adoption_request WHERE ar_userid = :user_id AND ar_animalid = :animal_id"),
        {"user_id": user_id, "animal_id": animal_id}
    )
    request_row = request_result.mappings().first()
    if not request_row:
        raise HTTPException(status_code=404, detail="Adoption request not found")
    
    # Work with enums safely
    current_status = RequestStatus(request_row["ar_status"])
    new_status = update.AR_STATUS
    
    # Define allowed transitions
    allowed_transitions = {
        RequestStatus.Submitted: [
            RequestStatus.Under_Review,
            RequestStatus.Approved,
            RequestStatus.Rejected,
            RequestStatus.Cancelled
        ],
        RequestStatus.Under_Review: [
            RequestStatus.Approved,
            RequestStatus.Rejected,
            RequestStatus.Cancelled
        ],
        RequestStatus.Approved: [],
        RequestStatus.Rejected: [],
        RequestStatus.Cancelled: []
    }
    
    # Check if transition is allowed
    if new_status not in allowed_transitions.get(current_status, []):
        raise HTTPException(status_code=400, detail="Invalid status transition")
    
    # Update the request's status
    db.execute(
        text("""
            UPDATE adoption_request
            SET ar_status = :new_status, ar_updatedat = NOW()
            WHERE ar_userid = :user_id AND ar_animalid = :animal_id
        """),
        {
            "new_status": new_status.value,
            "user_id": user_id,
            "animal_id": animal_id
        }
    )
    
    # If approving, update animal and cancel other active requests
    if new_status == RequestStatus.Approved:
        # Load the related animal
        animal_result = db.execute(
            text("SELECT * FROM animal WHERE a_animalid = :animal_id"),
            {"animal_id": animal_id}
        )
        animal_row = animal_result.mappings().first()
        if not animal_row:
            raise HTTPException(status_code=500, detail="Associated animal not found")
        
        # Ensure the animal is adoptable
        if animal_row["a_status"] != AnimalStatus.Adoptable.value:
            raise HTTPException(status_code=400, detail="Animal is not adoptable")
        
        # Mark the animal as adopted
        db.execute(
            text("UPDATE animal SET a_status = :adopted_status WHERE a_animalid = :animal_id"),
            {
                "adopted_status": AnimalStatus.Adopted.value,
                "animal_id": animal_id
            }
        )
        
        # Close other active requests for the same animal
        active_statuses = [RequestStatus.Submitted.value, RequestStatus.Under_Review.value]
        db.execute(
            text("""
                UPDATE adoption_request
                SET ar_status = :cancelled_status, ar_updatedat = NOW()
                WHERE ar_animalid = :animal_id
                  AND ar_userid != :user_id
                  AND ar_status IN (:s1, :s2)
            """),
            {
                "cancelled_status": RequestStatus.Cancelled.value,
                "animal_id": animal_id,
                "user_id": user_id,
                "s1": active_statuses[0],
                "s2": active_statuses[1]
            }
        )
    
    db.commit()
    
    # Re-select and return the updated request
    final_result = db.execute(
        text("""
            SELECT
                ar_userid    AS "AR_USERID",
                ar_animalid  AS "AR_ANIMALID",
                ar_status    AS "AR_STATUS",
                ar_createdat AS "AR_CREATEDAT",
                ar_updatedat AS "AR_UPDATEDAT"
            FROM adoption_request
            WHERE ar_userid = :user_id AND ar_animalid = :animal_id
        """),
        {"user_id": user_id, "animal_id": animal_id}
    )
    final_row = final_result.mappings().one()
    return AdoptionRequestOut.model_validate(final_row)

@app.get("/animals/{animal_id}/medical-records", response_model=List[MedicalRecordOut])
def get_animal_medical_records(animal_id: int, db: Session = Depends(get_db)):
    # Verify animal exists
    animal_check = db.execute(
        text("SELECT 1 FROM animal WHERE a_animalid = :animal_id"),
        {"animal_id": animal_id}
    )
    if not animal_check.first():
        raise HTTPException(status_code=404, detail="Animal not found")
    
    # Fetch medical records for this animal
    sql = text("""
        SELECT
            mr_recordid      AS "MR_RECORDID",
            mr_animalid      AS "MR_ANIMALID",
            mr_treatmenttype AS "MR_TREATMENTTYPE",
            mr_treatmentdate AS "MR_TREATMENTDATE"
        FROM medical_record
        WHERE mr_animalid = :animal_id
        ORDER BY mr_treatmentdate DESC
    """)
    result = db.execute(sql, {"animal_id": animal_id})
    rows = result.mappings().all()
    return [MedicalRecordOut.model_validate(row) for row in rows]

@app.get("/animals/{animal_id}/intake-records", response_model=List[IntakeRecordOut])
def get_animal_intake_records(animal_id: int, db: Session = Depends(get_db)):
    # Verify animal exists
    animal_check = db.execute(
        text("SELECT 1 FROM animal WHERE a_animalid = :animal_id"),
        {"animal_id": animal_id}
    )
    if not animal_check.first():
        raise HTTPException(status_code=404, detail="Animal not found")
    
    # Fetch intake records for this animal
    sql = text("""
        SELECT
            ir_intakeid   AS "IR_INTAKEID",
            ir_animalid   AS "IR_ANIMALID",
            ir_intaketype AS "IR_INTAKETYPE",
            ir_intakedate AS "IR_INTAKEDATE",
            ir_condition  AS "IR_CONDITION"
        FROM intake_record
        WHERE ir_animalid = :animal_id
        ORDER BY ir_intakedate DESC
    """)
    result = db.execute(sql, {"animal_id": animal_id})
    rows = result.mappings().all()
    return [IntakeRecordOut.model_validate(row) for row in rows]
