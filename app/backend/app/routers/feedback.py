from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate, FeedbackRead, FeedbackUpdate, Theme, Status

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.get("/", response_model=list[FeedbackRead])
def list_feedback(
    search: str | None = Query(None, description="Case-insensitive substring match against client_name"),
    theme: Theme | None = Query(None, description="Exact match filter on theme"),
    status: Status | None = Query(None, description="Exact match filter on status"),
    db: Session = Depends(get_db),
):
    query = db.query(Feedback)
    if search is not None:
        query = query.filter(Feedback.client_name.ilike(f"%{search}%"))
    if theme is not None:
        query = query.filter(Feedback.theme == theme)
    if status is not None:
        query = query.filter(Feedback.status == status)
    query = query.order_by(Feedback.date_logged.desc())
    return query.all()


@router.get("/{feedback_id}", response_model=FeedbackRead)
def get_feedback(feedback_id: int, db: Session = Depends(get_db)):
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback item not found")
    return feedback


@router.post("/", response_model=FeedbackRead, status_code=status.HTTP_201_CREATED)
def create_feedback(body: FeedbackCreate, db: Session = Depends(get_db)):
    feedback = Feedback(**body.model_dump())
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


@router.patch("/{feedback_id}", response_model=FeedbackRead)
def update_feedback(feedback_id: int, body: FeedbackUpdate, db: Session = Depends(get_db)):
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback item not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(feedback, key, value)
    db.commit()
    db.refresh(feedback)
    return feedback


@router.delete("/{feedback_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_feedback(feedback_id: int, db: Session = Depends(get_db)):
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback item not found")
    db.delete(feedback)
    db.commit()
