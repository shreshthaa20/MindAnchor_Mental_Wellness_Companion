import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shared/models/journal_entry.dart';
import 'api_provider.dart';

class JournalNotifier
    extends StateNotifier<AsyncValue<List<JournalEntry>>> {
  JournalNotifier(this._ref) : super(const AsyncValue.loading()) {
    loadJournals();
  }

  final Ref _ref;

  Future<void> loadJournals() async {
    state = const AsyncValue.loading();
    try {
      final journals =
          await _ref.read(journalRepositoryProvider).getJournals();
      if (!mounted) return;
      state = AsyncValue.data(journals);
    } catch (error, stackTrace) {
      if (!mounted) return;
      state = AsyncValue.error(error, stackTrace);
    }
  }

  Future<void> addJournal({
    required String title,
    required String content,
  }) async {
    final previous = state.value ?? [];
    try {
      final journal = await _ref
          .read(journalRepositoryProvider)
          .createJournal(title: title, content: content);
      state = AsyncValue.data([journal, ...previous]);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
      state = AsyncValue.data(previous);
      rethrow;
    }
  }

  Future<void> updateJournal({
    required int id,
    required String title,
    required String content,
  }) async {
    final previous = state.value ?? [];
    try {
      final journal =
          await _ref.read(journalRepositoryProvider).updateJournal(
                id: id,
                title: title,
                content: content,
              );
      state = AsyncValue.data(
        previous
            .map((item) => item.id == id ? journal : item)
            .toList(),
      );
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
      state = AsyncValue.data(previous);
      rethrow;
    }
  }

  Future<void> deleteJournal(int id) async {
    final previous = state.value ?? [];
    try {
      await _ref.read(journalRepositoryProvider).deleteJournal(id);
      state = AsyncValue.data(
        previous.where((item) => item.id != id).toList(),
      );
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
      state = AsyncValue.data(previous);
      rethrow;
    }
  }
}

final journalProvider =
    StateNotifierProvider<JournalNotifier,
        AsyncValue<List<JournalEntry>>>(
  (ref) => JournalNotifier(ref),
);
