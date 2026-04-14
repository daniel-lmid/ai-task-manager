import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskListComponent } from './task-list.component';
import { FormsModule } from '@angular/forms';

describe('TaskListComponent', () => {
  let component: TaskListComponent;
  let fixture: ComponentFixture<TaskListComponent>;

  const mockTask = {
    id: 1,
    title: 'Test Task',
    description: 'Test Description',
    completed: false
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskListComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ✅ create
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // =========================
  // EDIT FLOW
  // =========================

  it('should start edit mode', () => {
    component.startEdit(mockTask);

    expect(component.editingId).toBe(1);
    expect(component.editTitle).toBe('Test Task');
    expect(component.editDescription).toBe('Test Description');
  });

  it('should cancel edit mode', () => {
    component.startEdit(mockTask);

    component.cancelEdit();

    expect(component.editingId).toBeNull();
  });

  it('should emit update and exit edit mode on saveEdit', () => {
    spyOn(component.update, 'emit');

    component.startEdit(mockTask);

    component.editTitle = 'Updated';
    component.editDescription = 'Updated Desc';

    component.saveEdit(mockTask);

    expect(component.update.emit).toHaveBeenCalledWith({
      id: 1,
      title: 'Updated',
      description: 'Updated Desc'
    });

    expect(component.editingId).toBeNull();
  });

  // =========================
  // DELETE
  // =========================

  it('should emit delete event', () => {
    spyOn(component.delete, 'emit');

    component.onDelete(1);

    expect(component.delete.emit).toHaveBeenCalledWith(1);
  });

  // =========================
  // TOGGLE COMPLETE
  // =========================

  it('should emit toggleComplete event', () => {
    spyOn(component.toggleComplete, 'emit');

    component.onToggle(1);

    expect(component.toggleComplete.emit).toHaveBeenCalledWith(1);
  });

  // =========================
  // STATE EDGE CASES
  // =========================

  it('should overwrite edit values when starting a new edit', () => {
    const anotherTask = {
      id: 2,
      title: 'Another',
      description: 'Another desc',
      completed: false
    };

    component.startEdit(mockTask);
    component.startEdit(anotherTask);

    expect(component.editingId).toBe(2);
    expect(component.editTitle).toBe('Another');
    expect(component.editDescription).toBe('Another desc');
  });

  it('should allow empty description in edit', () => {
    spyOn(component.update, 'emit');

    component.startEdit(mockTask);
    component.editDescription = '';

    component.saveEdit(mockTask);

    expect(component.update.emit).toHaveBeenCalledWith({
      id: 1,
      title: 'Test Task',
      description: ''
    });
  });
});