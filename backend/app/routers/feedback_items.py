import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.feedback_item import FeedbackItem
from app.schemas.feedback_item import FeedbackItemCreate, FeedbackItemRead, FeedbackItemUpdate

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.get("/", response_model=list[FeedbackItemRead])
def list_feedback_items(db: Session = Depends(get_db)):
    return db.query(FeedbackItem).order_by(FeedbackItem.created_at.desc()).all()


@router.post("/", response_model=FeedbackItemRead, status_code=status.HTTP_201_CREATED)
def create_feedback_item(body: FeedbackItemCreate, db: Session = Depends(get_db)):
    item = FeedbackItem(**body.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{feedback_id}", response_model=FeedbackItemRead)
def get_feedback_item(feedback_id: uuid.UUID, db: Session = Depends(get_db)):
    item = db.query(FeedbackItem).filter(FeedbackItem.id == feedback_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback item not found")
    return item


@router.patch("/{feedback_id}", response_model=FeedbackItemRead)
def update_feedback_item(feedback_id: uuid.UUID, body: FeedbackItemUpdate, db: Session = Depends(get_db)):
    item = db.query(FeedbackItem).filter(FeedbackItem.id == feedback_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback item not found")
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{feedback_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_feedback_item(feedback_id: uuid.UUID, db: Session = Depends(get_db)):
    item = db.query(FeedbackItem).filter(FeedbackItem.id == feedback_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback item not found")
    db.delete(item)
    db.commit()
