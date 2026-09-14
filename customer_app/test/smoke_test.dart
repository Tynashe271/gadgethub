import 'package:flutter_test/flutter_test.dart';
import 'package:gadgethub_customer/core.dart';

void main() {
  test('customer theme uses GadgetHub lime', () {
    expect(gadgetTheme().colorScheme.primary, acid);
  });
}
